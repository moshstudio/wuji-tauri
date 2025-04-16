use m3u8_rs::{parse_playlist_res, Playlist};
use regex::Regex;

pub struct AdRemover {
    ad_patterns: Vec<Regex>,
    max_initial_ads: usize,
    min_sequence_length: usize,
}
impl AdRemover {
    pub fn new() -> Self {
        AdRemover {
            ad_patterns: vec![
                Regex::new(r"ad\.ts$").unwrap(),
                Regex::new(r"advertisement").unwrap(),
                Regex::new(r"/ad/").unwrap(),
                Regex::new(r"_ad_").unwrap(),
            ],
            max_initial_ads: 30,
            min_sequence_length: 5,
        }
    }

    pub fn with_patterns(patterns: Vec<&str>) -> Self {
        let mut remover = Self::new();
        remover.ad_patterns = patterns
            .into_iter()
            .map(|p| Regex::new(p).unwrap())
            .collect();
        remover
    }

    fn is_ad_segment(&self, uri: &str) -> bool {
        self.ad_patterns.iter().any(|re| re.is_match(uri))
    }

    fn detect_ad_sequences(&self, segments: &[String]) -> Vec<usize> {
        let mut ad_indices = Vec::new();
        let mut expected_num: Option<usize> = None; // 使用Option表示尚未确定起始序号
        let mut in_sequence = false;
        let mut sequence_start = 0;

        // 第一阶段：检测序号模式
        for (i, seg) in segments.iter().enumerate() {
            if let Some(num_str) = seg.split("%2F").last().and_then(|s| s.split('.').next()) {
                // 提取最后3-6位数字作为序号（可根据实际情况调整）
                let numeric_part: String = num_str.chars().filter(|c| c.is_ascii_digit()).collect();

                // 取最后几位数字（假设序号在末尾）
                let num_digits = if numeric_part.len() > 6 {
                    &numeric_part[numeric_part.len().saturating_sub(6)..]
                } else {
                    &numeric_part[..]
                };

                if !num_digits.is_empty() {
                    if let Ok(current_num) = num_digits.parse::<usize>() {
                        match expected_num {
                            Some(expected) => {
                                if current_num == expected {
                                    // 序号匹配预期
                                    if !in_sequence {
                                        in_sequence = true;
                                        sequence_start = i;
                                    }
                                    expected_num = Some(expected + 1);
                                    continue;
                                } else if in_sequence
                                    && (i - sequence_start) >= self.min_sequence_length
                                {
                                    // 序列中断，标记前面的为内容，当前可能是广告
                                    for ad_idx in 0..sequence_start {
                                        if !ad_indices.contains(&ad_idx)
                                            && self.is_ad_segment(&segments[ad_idx])
                                        {
                                            ad_indices.push(ad_idx);
                                        }
                                    }
                                }
                                // 当前分段可能是广告
                                if self.is_ad_segment(seg) && !ad_indices.contains(&i) {
                                    ad_indices.push(i);
                                }
                                in_sequence = false;
                            }
                            None => {
                                // 初始化序列，假设下一个应该是current_num+1
                                expected_num = Some(current_num + 1);
                                in_sequence = true;
                                sequence_start = i;
                            }
                        }
                    }
                }
            }

            // 无法提取数字但之前有足够长的序列
            if in_sequence && (i - sequence_start) >= self.min_sequence_length {
                if !ad_indices.contains(&i) && self.is_ad_segment(seg) {
                    ad_indices.push(i);
                }
            }
        }

        // 第二阶段：如果没有找到序号模式，检查URL模式
        if ad_indices.is_empty() {
            if let Some(base_seg) = segments.iter().find(|s| !self.is_ad_segment(s)) {
                let base_uri = base_seg.split('/').collect::<Vec<_>>();
                let base_uri_len = base_uri.len().min(3);
                let base_uri = base_uri[..base_uri_len].join("/");

                for (i, seg) in segments.iter().enumerate() {
                    let seg_parts = seg.split('/').collect::<Vec<_>>();
                    let seg_uri = seg_parts[..base_uri_len.min(seg_parts.len())].join("/");

                    if seg_uri != base_uri && self.is_ad_segment(seg) && !ad_indices.contains(&i) {
                        ad_indices.push(i);
                    }
                }
            }
        }

        ad_indices.sort_unstable();
        ad_indices
    }
    pub fn run(&self, content: String) -> String {
        // 解析M3U8
        let playlist = match parse_playlist_res(content.as_bytes()) {
            Ok(p) => p,
            Err(e) => return format!("Failed to parse M3U8: {}", e),
        };

        match playlist {
            Playlist::MasterPlaylist(_) => {
                return content.to_string();
            }
            Playlist::MediaPlaylist(media_playlist) => {
                let segments: Vec<String> = media_playlist
                    .segments
                    .iter()
                    .map(|seg| seg.uri.clone())
                    .collect();

                // 检测广告片段
                let ad_indices = self.detect_ad_sequences(&segments);
                dbg!("ad_indices: {:?}", ad_indices.clone());

                // 构建无广告的播放列表
                let mut clean_playlist = media_playlist.clone();
                clean_playlist.segments.retain(|seg| {
                    let uri = seg.uri.clone();
                    !ad_indices.contains(&segments.iter().position(|s| s == &uri).unwrap())
                });
                let mut bytes = Vec::new();
                let _ = clean_playlist
                    .write_to(&mut bytes)
                    .map_err(|e| format!("Failed to serialize: {}", e));

                let str_data =
                    String::from_utf8(bytes).map_err(|e| format!("Invalid UTF-8: {}", e));
                return str_data.unwrap();
            }
        }
    }
}
