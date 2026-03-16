use m3u8_rs::{parse_playlist_res, MediaPlaylist, Playlist};
use std::collections::HashMap;

pub struct AdRemover {}

impl AdRemover {
    pub fn new() -> Self {
        Self {}
    }

    /// 执行广告移除过滤
    pub fn run(&self, content: &str) -> Result<String, String> {
        let playlist = match parse_playlist_res(content.as_bytes()) {
            Ok(p) => p,
            Err(e) => return Err(format!("Failed to parse M3U8: {}", e)),
        };

        match playlist {
            Playlist::MasterPlaylist(_) => {
                // 主播放列表不需要去广告
                Ok(content.to_string())
            }
            Playlist::MediaPlaylist(media_playlist) => {
                let cleaned_playlist = self.clean_media_playlist(&media_playlist);

                let mut bytes = Vec::new();
                if let Err(e) = cleaned_playlist.write_to(&mut bytes) {
                    return Err(format!("Failed to serialize: {}", e));
                }

                String::from_utf8(bytes).map_err(|e| format!("Invalid UTF-8: {}", e))
            }
        }
    }

    fn clean_media_playlist(&self, pl: &MediaPlaylist) -> MediaPlaylist {
        let mut new_pl = pl.clone();
        if pl.segments.is_empty() {
            return new_pl;
        }

        let total_segments = pl.segments.len();

        // --- 维度 1：路径聚类分类 ---
        // 提取所有的包含域名的前缀或目录。如果同一个源切片大多数应该来自同一个前缀。
        let mut path_counts: HashMap<String, usize> = HashMap::new();
        for seg in &pl.segments {
            let path = get_base_path(&seg.uri);
            *path_counts.entry(path).or_insert(0) += 1;
        }

        // 找出拥有最多切片的路径（大概率是正片路径）
        let (main_path, main_count) = path_counts
            .iter()
            .max_by_key(|entry| entry.1)
            .map(|(k, v)| (k.clone(), *v))
            .unwrap_or(("".to_string(), 0usize));

        let has_dominant_path = (main_count as f64 / total_segments as f64) > 0.6; // 主路径占 60% 以上才具有说服力

        // --- 维度 2：时长众数分析 ---
        // 主媒体文件的切片往往有一个非常稳定的标准时长，比如刚好是 target_duration，或某一个固定浮点数。
        let mut duration_counts: HashMap<String, usize> = HashMap::new();
        for seg in &pl.segments {
            // 四舍五入到最近的整数，找最常见的切片时长范围
            let rounded_duration = seg.duration.round() as u64;
            *duration_counts
                .entry(rounded_duration.to_string())
                .or_insert(0) += 1;
        }

        let main_duration_key = duration_counts
            .iter()
            .max_by_key(|entry| entry.1)
            .map(|(k, _)| k.clone())
            .unwrap_or_else(|| "0".to_string());
        let main_duration_val = main_duration_key.parse::<i64>().unwrap_or(0);

        // --- 开始过滤 ---
        let mut ad_indices = Vec::new();

        // 区块标记（识别头部和尾部的异常块）
        // 很多广告只存在于头部几个切片或尾部。
        let mut is_header_zone = true;

        for (i, seg) in pl.segments.iter().enumerate() {
            let uri_lower = seg.uri.to_lowercase();
            let mut is_ad = false;

            // 1. 传统正则/黑名单拦截（硬性广告特征，适用于一些没技术含量的广告商）
            if uri_lower.contains("ad.ts")
                || uri_lower.contains("/ad/")
                || uri_lower.contains("_ad_")
                || uri_lower.contains("advertisement")
            {
                is_ad = true;
                println!("[AdRemove] [Keyword] Removed: {}", seg.uri);
            }

            // 2. 路径聚类过滤
            if has_dominant_path && !is_ad {
                let path = get_base_path(&seg.uri);
                // 如果当前切片路径与主路径不同，并且该路径小的可怜 (比如小于总数的10%或不到5个)，强判定为贴片广告
                if path != main_path {
                    let path_count = *path_counts.get(&path).unwrap_or(&0);
                    if path_count < 10 && (path_count as f64 / total_segments as f64) < 0.15 {
                        is_ad = true;
                        println!("[AdRemove] [PathCluster] Removed (count: {}, path: {}): {}", path_count, path, seg.uri);
                    }
                }
            }

            // 3. 头部异常时长/序号过滤
            // 往往前一两个片段是广告片段，它们的 target_duration 和正片不同，并且没有进入主路径
            let current_duration_rounded = seg.duration.round() as i64;
            let duration_diff = (current_duration_rounded - main_duration_val).abs();

            if is_header_zone && !is_ad {
                // 如果片段的时长与主时长偏差较大（比如主时长是10s，广告只有3s或15s）
                if duration_diff >= 3 {
                    let path = get_base_path(&seg.uri);
                    // 如果它的路径与多数派不一样，那么是实锤的广告
                    if !has_dominant_path || path != main_path {
                        is_ad = true;
                        println!("[AdRemove] [HeaderAnomaly] Removed (duration: {}s, diff: {}s): {}", seg.duration, duration_diff, seg.uri);
                    }
                }
            }

            // 如果遇到被确认为正片主特征的片段，退出 header_zone 检测
            if !is_ad {
                let path = get_base_path(&seg.uri);
                if (!has_dominant_path || path == main_path) && duration_diff < 3 {
                    is_header_zone = false; // 进入正片连续播放区
                }
            }

            if is_ad {
                ad_indices.push(i);
            }
        }

        if !ad_indices.is_empty() {
            println!("[AdRemove] Total removed: {} segments.", ad_indices.len());
        }

        // 移除被判定为广告的片段
        new_pl.segments = pl
            .segments
            .iter()
            .enumerate()
            .filter_map(|(i, seg)| {
                if ad_indices.contains(&i) {
                    None
                } else {
                    Some(seg.clone())
                }
            })
            .collect();

        // 最终清理：移除连续的多余的 #EXT-X-DISCONTINUITY
        let mut cleaned_segments = Vec::new();
        let mut last_was_discontinuity = false;

        for mut seg in new_pl.segments {
            if seg.discontinuity {
                if last_was_discontinuity || cleaned_segments.is_empty() {
                    // 跳过多余的 discontinuity 或处于片头的 discontinuity
                    seg.discontinuity = false;
                }
                last_was_discontinuity = seg.discontinuity;
            } else {
                last_was_discontinuity = false;
            }
            cleaned_segments.push(seg);
        }
        new_pl.segments = cleaned_segments;

        new_pl
    }
}

// 辅助函数：提取 URI 中的基础路径或域名结构，去除了最后的文件名
fn get_base_path(uri: &str) -> String {
    // 剔除可能的 URL query strings
    let clean_uri = uri.split('?').next().unwrap_or(uri);
    if let Some(pos) = clean_uri.rfind('/') {
        clean_uri[..pos].to_string()
    } else {
        "".to_string()
    }
}
