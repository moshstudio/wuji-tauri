//! HLS 贴片广告启发式过滤（基于 discontinuity group）。
//!
//! 规则参考 open-ani/animeko HlsManifestFilter / private-taichi hls_ad_filter，偏保守：
//! - 仅 VOD（#EXT-X-ENDLIST）
//! - 必须有 #EXT-X-DISCONTINUITY
//! - 隐式 IV / 隐式 byte-range offset 时跳过
//! - 过滤失败或结果无 EXTINF 时回退原文

use std::collections::{HashMap, HashSet};

/// 过滤结果状态
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FilterStatus {
    Filtered,
    Unchanged,
    Unsupported,
}

/// 被移除的 discontinuity group 摘要
#[derive(Debug, Clone)]
pub struct RemovedGroup {
    pub index: usize,
    pub duration: f32,
    pub segment_count: usize,
    pub reasons: Vec<&'static str>,
    pub file_names: Vec<String>,
}

/// 过滤结果
#[derive(Debug, Clone)]
pub struct FilterResult {
    pub status: FilterStatus,
    pub content: String,
    pub reason: Option<&'static str>,
    pub removed_groups: Vec<RemovedGroup>,
}

impl FilterResult {
    pub fn summary(&self) -> String {
        if self.status != FilterStatus::Filtered || self.removed_groups.is_empty() {
            return format!(
                "status={:?} reason={}",
                self.status,
                self.reason.unwrap_or("-")
            );
        }

        let mut total_dur = 0.0_f32;
        let mut total_segs = 0_usize;
        let mut parts: Vec<String> = Vec::new();
        for g in &self.removed_groups {
            total_dur += g.duration;
            total_segs += g.segment_count;
            let take = g.file_names.len().min(4);
            let mut names = g.file_names[..take].join(", ");
            if g.file_names.len() > 4 {
                names.push_str(", ...(+");
                names.push_str(&(g.file_names.len() - 4).to_string());
                names.push(')');
            }
            parts.push(format!(
                "group#{} {:.1}s*{} [{}] {}",
                g.index, g.duration, g.segment_count, g.reasons.join("|"), names
            ));
        }

        return format!(
            "removed {} group(s), {} seg, {:.1}s | {}",
            self.removed_groups.len(),
            total_segs,
            total_dur,
            parts.join(" ; ")
        );
    }
}

/// 兼容旧调用：过滤广告，失败或未变更时返回可用正文。
pub struct AdRemover {
    enable_aggressive: bool,
}

impl AdRemover {
    pub fn new() -> Self {
        Self {
            enable_aggressive: false,
        }
    }

    pub fn with_aggressive(mut self, enable: bool) -> Self {
        self.enable_aggressive = enable;
        self
    }

    /// 执行广告移除；解析/安全条件不满足时返回 Ok(原文)。
    pub fn run(&self, content: &str) -> Result<String, String> {
        let result = filter_media_playlist(content, self.enable_aggressive);
        match result.status {
            FilterStatus::Filtered => {
                let ok = result.content.trim_start().starts_with("#EXTM3U")
                    && result.content.contains("#EXTINF");
                if ok {
                    #[cfg(debug_assertions)]
                    println!("[AdRemove] {}", result.summary());
                    Ok(result.content)
                } else {
                    Err("empty_after_filter".to_string())
                }
            }
            FilterStatus::Unchanged | FilterStatus::Unsupported => {
                #[cfg(debug_assertions)]
                println!("[AdRemove] skip: {}", result.summary());
                Ok(result.content)
            }
        }
    }
}

impl Default for AdRemover {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// 解析
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
struct MediaSegment {
    index: usize,
    duration: f32,
    uri: String,
    file_name: String,
    /// 1-based inclusive
    line_start: usize,
    /// 1-based inclusive
    line_end: usize,
    is_discontinuity: bool,
    encryption_method: Option<String>,
    encryption_iv: Option<String>,
    has_byte_range: bool,
    byte_range_has_offset: bool,
}

#[derive(Debug, Clone)]
struct ManifestGroup {
    index: usize,
    line_start: usize,
    line_end: usize,
    start_segment_index: usize,
    end_segment_index: usize,
    duration: f32,
    count: usize,
    file_signature: String,
    segments: Vec<MediaSegment>,
}

#[derive(Debug)]
struct MediaPlaylist {
    lines: Vec<String>,
    segments: Vec<MediaSegment>,
    groups: Vec<ManifestGroup>,
    is_endlist: bool,
    is_master: bool,
}

fn segment_file_name(uri: &str) -> String {
    let clean = uri
        .split('?')
        .next()
        .unwrap_or(uri)
        .split('#')
        .next()
        .unwrap_or(uri);
    clean.rsplit('/').next().unwrap_or(clean).to_string()
}

fn segment_path(uri: &str) -> String {
    let clean = uri
        .split('?')
        .next()
        .unwrap_or(uri)
        .split('#')
        .next()
        .unwrap_or(uri);
    let path = if let Some((_, rest)) = clean.split_once("://") {
        match rest.split_once('/') {
            Some((_, p)) => p.to_string(),
            None => String::new(),
        }
    } else {
        clean.to_string()
    };
    if path.is_empty() {
        return String::new();
    }
    if path.starts_with('/') {
        return path;
    }
    let mut out = String::with_capacity(path.len() + 1);
    out.push('/');
    out.push_str(&path);
    out
}

fn parse_extinf_duration(line: &str) -> f32 {
    let raw = line
        .split_once(':')
        .map(|(_, rest)| rest.split(',').next().unwrap_or("").trim())
        .unwrap_or("0");
    raw.parse::<f32>().unwrap_or(0.0)
}

fn parse_key_attrs(line: &str) -> (Option<String>, Option<String>) {
    let body = line.split_once(':').map(|(_, b)| b).unwrap_or("");
    let mut method = None;
    let mut iv = None;
    for part in body.split(',') {
        let part = part.trim();
        let upper = part.to_ascii_uppercase();
        if upper.starts_with("METHOD=") {
            method = Some(
                part.split_once('=')
                    .map(|(_, v)| v.trim().trim_matches('"').to_string())
                    .unwrap_or_default(),
            );
        } else if upper.starts_with("IV=") {
            iv = Some(
                part.split_once('=')
                    .map(|(_, v)| v.trim().trim_matches('"').to_string())
                    .unwrap_or_default(),
            );
        }
    }
    (method, iv)
}

fn parse_playlist(text: &str) -> MediaPlaylist {
    let lines: Vec<String> = text.lines().map(|l| l.to_string()).collect();
    let is_master = lines
        .iter()
        .any(|l| l.trim().starts_with("#EXT-X-STREAM-INF"));
    let is_endlist = lines.iter().any(|l| l.trim() == "#EXT-X-ENDLIST");

    let mut segments = Vec::new();
    let mut pending_duration: Option<f32> = None;
    let mut pending_start: Option<usize> = None;
    let mut discontinuity = false;
    let mut encryption_method: Option<String> = None;
    let mut encryption_iv: Option<String> = None;
    let mut has_byte_range = false;
    let mut byte_range_has_offset = false;

    for (idx, raw) in lines.iter().enumerate() {
        let line_no = idx + 1;
        let line = raw.trim();
        if line.is_empty() {
            continue;
        }
        if line.starts_with("#EXT-X-KEY:") {
            let (m, i) = parse_key_attrs(line);
            encryption_method = m;
            encryption_iv = i;
            continue;
        }
        if line.starts_with("#EXT-X-BYTERANGE:") {
            has_byte_range = true;
            let body = line.split_once(':').map(|(_, b)| b.trim()).unwrap_or("");
            byte_range_has_offset = body.contains('@');
            continue;
        }
        if line == "#EXT-X-DISCONTINUITY" {
            discontinuity = true;
            continue;
        }
        if line.starts_with("#EXTINF:") {
            pending_duration = Some(parse_extinf_duration(line));
            pending_start = Some(line_no);
            continue;
        }
        if line.starts_with('#') {
            continue;
        }
        let (Some(duration), Some(start)) = (pending_duration, pending_start) else {
            continue;
        };

        let uri = line.to_string();
        segments.push(MediaSegment {
            index: segments.len(),
            duration,
            uri: uri.clone(),
            file_name: segment_file_name(&uri),
            line_start: start,
            line_end: line_no,
            is_discontinuity: discontinuity,
            encryption_method: encryption_method.clone(),
            encryption_iv: encryption_iv.clone(),
            has_byte_range,
            byte_range_has_offset,
        });
        pending_duration = None;
        pending_start = None;
        discontinuity = false;
        has_byte_range = false;
        byte_range_has_offset = false;
    }

    let groups = build_groups(&segments);
    MediaPlaylist {
        lines,
        segments,
        groups,
        is_endlist,
        is_master,
    }
}

fn build_groups(segments: &[MediaSegment]) -> Vec<ManifestGroup> {
    if segments.is_empty() {
        return Vec::new();
    }
    let mut groups = Vec::new();
    let mut current: Vec<MediaSegment> = Vec::new();

    let close = |groups: &mut Vec<ManifestGroup>, current: &mut Vec<MediaSegment>| {
        if current.is_empty() {
            return;
        }
        let duration: f32 = current.iter().map(|s| s.duration).sum();
        let file_signature = current
            .iter()
            .map(|s| s.file_name.as_str())
            .collect::<Vec<_>>()
            .join("|");
        groups.push(ManifestGroup {
            index: groups.len(),
            line_start: current[0].line_start,
            line_end: current[current.len() - 1].line_end,
            start_segment_index: current[0].index,
            end_segment_index: current[current.len() - 1].index,
            duration,
            count: current.len(),
            file_signature,
            segments: std::mem::take(current),
        });
    };

    for seg in segments {
        if seg.is_discontinuity && !current.is_empty() {
            close(&mut groups, &mut current);
        }
        current.push(seg.clone());
    }
    close(&mut groups, &mut current);
    groups
}

fn has_discontinuity(playlist: &MediaPlaylist) -> bool {
    playlist.segments.iter().any(|s| s.is_discontinuity)
}

// ---------------------------------------------------------------------------
// 过滤
// ---------------------------------------------------------------------------

const STRONG_PATH_HINTS: &[&str] = &["adjump", "/ad/", "/ads/", "advert", "/gg/", "guanggao"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CandidateReason {
    StrongPath,
    RepeatShort,
    SandwichedShort,
    LowDensityShort,
    SequenceIsland,
    DenseTiny,
}

impl CandidateReason {
    fn as_str(self) -> &'static str {
        match self {
            Self::StrongPath => "strong_path",
            Self::RepeatShort => "repeat_short",
            Self::SandwichedShort => "sandwiched_short",
            Self::LowDensityShort => "low_density_short",
            Self::SequenceIsland => "sequence_island",
            Self::DenseTiny => "dense_tiny",
        }
    }
}

/// 对 media playlist 正文做贴片广告过滤。
pub fn filter_media_playlist(content: &str, enable_aggressive: bool) -> FilterResult {
    let original = content.to_string();
    let playlist = parse_playlist(content);

    if playlist.is_master {
        return FilterResult {
            status: FilterStatus::Unsupported,
            content: original,
            reason: Some("master_playlist"),
            removed_groups: vec![],
        };
    }
    if !playlist.is_endlist {
        return FilterResult {
            status: FilterStatus::Unsupported,
            content: original,
            reason: Some("live_or_incomplete_playlist"),
            removed_groups: vec![],
        };
    }
    if !has_discontinuity(&playlist) {
        return FilterResult {
            status: FilterStatus::Unchanged,
            content: original,
            reason: Some("no_discontinuity"),
            removed_groups: vec![],
        };
    }
    if playlist.groups.is_empty() {
        return FilterResult {
            status: FilterStatus::Unchanged,
            content: original,
            reason: Some("no_segments"),
            removed_groups: vec![],
        };
    }
    if has_aes128_without_explicit_iv(&playlist) {
        return FilterResult {
            status: FilterStatus::Unchanged,
            content: original,
            reason: Some("encrypted_implicit_iv"),
            removed_groups: vec![],
        };
    }
    if has_byterange_without_offset(&playlist) {
        return FilterResult {
            status: FilterStatus::Unchanged,
            content: original,
            reason: Some("byterange_implicit_offset"),
            removed_groups: vec![],
        };
    }

    let candidates = detect_candidates(&playlist.groups, &playlist.segments, enable_aggressive);
    if candidates.is_empty() {
        return FilterResult {
            status: FilterStatus::Unchanged,
            content: original,
            reason: Some("no_candidate"),
            removed_groups: vec![],
        };
    }

    let removable: HashSet<usize> = candidates.iter().map(|(g, _)| g.index).collect();
    let remaining: usize = playlist
        .groups
        .iter()
        .filter(|g| !removable.contains(&g.index))
        .map(|g| g.count)
        .sum();
    if remaining == 0 {
        return FilterResult {
            status: FilterStatus::Unchanged,
            content: original,
            reason: Some("all_segments_candidate"),
            removed_groups: vec![],
        };
    }

    let mut removed_lines: HashSet<usize> = HashSet::new();
    let mut removed_meta = Vec::new();
    for (group, reasons) in &candidates {
        for line_no in group.line_start..=group.line_end {
            removed_lines.insert(line_no);
        }
        if let Some(disc_line) = find_leading_discontinuity_line(&playlist.lines, group.line_start)
        {
            removed_lines.insert(disc_line);
        }
        removed_meta.push(RemovedGroup {
            index: group.index,
            duration: group.duration,
            segment_count: group.count,
            reasons: reasons.iter().map(|r| r.as_str()).collect(),
            file_names: group.segments.iter().map(|s| s.file_name.clone()).collect(),
        });
    }

    let mut filtered_lines: Vec<String> = playlist
        .lines
        .iter()
        .enumerate()
        .filter(|(idx, _)| !removed_lines.contains(&(idx + 1)))
        .map(|(_, line)| line.clone())
        .collect();
    filtered_lines = dedupe_discontinuity(filtered_lines);

    let mut filtered = filtered_lines.join("\n");
    if !filtered.ends_with('\n') {
        filtered.push('\n');
    }

    FilterResult {
        status: FilterStatus::Filtered,
        content: filtered,
        reason: None,
        removed_groups: removed_meta,
    }
}

fn has_aes128_without_explicit_iv(playlist: &MediaPlaylist) -> bool {
    playlist.segments.iter().any(|seg| {
        seg.encryption_method
            .as_deref()
            .map(|m| m.eq_ignore_ascii_case("AES-128"))
            .unwrap_or(false)
            && seg.encryption_iv.is_none()
    })
}

fn has_byterange_without_offset(playlist: &MediaPlaylist) -> bool {
    playlist
        .segments
        .iter()
        .any(|seg| seg.has_byte_range && !seg.byte_range_has_offset)
}

fn find_leading_discontinuity_line(lines: &[String], line_start: usize) -> Option<usize> {
    // line_start 是 EXTINF 行（1-based）；向前扫空白，找紧邻的 DISCONTINUITY
    let mut idx = line_start as isize - 2; // 0-based before EXTINF
    while idx >= 0 {
        let stripped = lines[idx as usize].trim();
        if stripped.is_empty() {
            idx -= 1;
            continue;
        }
        if stripped == "#EXT-X-DISCONTINUITY" {
            return Some((idx + 1) as usize);
        }
        return None;
    }
    None
}

fn dedupe_discontinuity(lines: Vec<String>) -> Vec<String> {
    let mut out = Vec::new();
    let mut prev_disc = false;
    for line in lines {
        let stripped = line.trim();
        if stripped == "#EXT-X-DISCONTINUITY" {
            if prev_disc {
                continue;
            }
            prev_disc = true;
            out.push(line);
            continue;
        }
        if !stripped.is_empty() {
            prev_disc = false;
        }
        out.push(line);
    }
    out
}

fn detect_candidates(
    groups: &[ManifestGroup],
    segments: &[MediaSegment],
    enable_aggressive: bool,
) -> Vec<(ManifestGroup, Vec<CandidateReason>)> {
    let dense = groups.len() >= 20
        || (!segments.is_empty() && (groups.len() as f32 / segments.len() as f32) > 0.08);

    let mut signature_counts: HashMap<&str, usize> = HashMap::new();
    for g in groups {
        *signature_counts
            .entry(g.file_signature.as_str())
            .or_insert(0) += 1;
    }

    let sequence_prefix = if dense { numeric_model(segments) } else { None };

    let mut results = Vec::new();
    for (group_index, group) in groups.iter().enumerate() {
        let mut reasons = Vec::new();
        let previous = group_index.checked_sub(1).map(|i| &groups[i]);
        let next_group = groups.get(group_index + 1);
        let short = group.count <= 12 || group.duration <= 45.0;

        let paths = group
            .segments
            .iter()
            .map(|s| segment_path(&s.uri).to_ascii_lowercase())
            .collect::<Vec<_>>()
            .join(" ");
        if STRONG_PATH_HINTS.iter().any(|hint| paths.contains(hint)) {
            reasons.push(CandidateReason::StrongPath);
        }

        if *signature_counts
            .get(group.file_signature.as_str())
            .unwrap_or(&0)
            > 1
            && group.count <= 12
            && group.duration <= 45.0
        {
            reasons.push(CandidateReason::RepeatShort);
        }

        if let (Some(prev), Some(next)) = (previous, next_group) {
            if prev.duration >= 60.0
                && next.duration >= 60.0
                && group.duration <= 45.0
                && group.count >= 2
            {
                reasons.push(CandidateReason::SandwichedShort);
            }
        }

        if enable_aggressive && !dense && short && group.count >= 2 {
            let max_duration = groups.iter().map(|g| g.duration).fold(0.0_f32, f32::max);
            let max_duration = if max_duration > 0.0 {
                max_duration
            } else {
                1.0
            };
            if (10.0..=30.0).contains(&group.duration)
                && (3..=12).contains(&group.count)
                && group.duration / max_duration <= 0.05
                && groups.len() <= 10
            {
                reasons.push(CandidateReason::LowDensityShort);
            }
        }

        if is_sequence_island(dense, sequence_prefix.as_deref(), segments, group, short) {
            reasons.push(CandidateReason::SequenceIsland);
        }

        if enable_aggressive
            && dense
            && (group.count <= 3 || group.duration <= 12.0)
            && previous.is_some()
            && next_group.is_some()
        {
            reasons.push(CandidateReason::DenseTiny);
        }

        reasons.dedup();
        if !reasons.is_empty() {
            results.push((group.clone(), reasons));
        }
    }
    results
}

fn numeric_model(segments: &[MediaSegment]) -> Option<String> {
    let mut values: Vec<(String, i64)> = Vec::new();
    for seg in segments {
        if let Some((prefix, num)) = match_numeric_ts(&seg.file_name) {
            values.push((prefix, num));
        }
    }
    if values.is_empty() {
        return None;
    }
    let mut prefix_counts: HashMap<&str, usize> = HashMap::new();
    for (prefix, _) in &values {
        *prefix_counts.entry(prefix.as_str()).or_insert(0) += 1;
    }
    let (prefix, count) = prefix_counts.into_iter().max_by_key(|(_, c)| *c)?;
    if (count as f32) / (segments.len() as f32) < 0.8 {
        return None;
    }
    let numbers: Vec<i64> = values
        .iter()
        .filter(|(p, _)| p == prefix)
        .map(|(_, n)| *n)
        .collect();
    if numbers.len() < 2 {
        return None;
    }
    let deltas: Vec<i64> = numbers.windows(2).map(|w| w[1] - w[0]).collect();
    let mut delta_counts: HashMap<i64, usize> = HashMap::new();
    for d in &deltas {
        *delta_counts.entry(*d).or_insert(0) += 1;
    }
    let (best_delta, best_count) = delta_counts.into_iter().max_by_key(|(_, c)| *c)?;
    if best_delta != 1 || (best_count as f32) / (deltas.len() as f32) < 0.5 {
        return None;
    }
    Some(prefix.to_string())
}

fn match_numeric_ts(file_name: &str) -> Option<(String, i64)> {
    // ^(.*?)(\d{1,7})\.ts$
    let lower_ok = file_name.to_ascii_lowercase().ends_with(".ts");
    if !lower_ok {
        return None;
    }
    let without_ext = &file_name[..file_name.len() - 3];
    let digit_start = without_ext
        .char_indices()
        .rev()
        .take_while(|(_, c)| c.is_ascii_digit())
        .last()
        .map(|(i, _)| i)?;
    let digits = &without_ext[digit_start..];
    if digits.is_empty() || digits.len() > 7 {
        return None;
    }
    let num: i64 = digits.parse().ok()?;
    let prefix = without_ext[..digit_start].to_string();
    Some((prefix, num))
}

fn trailing_number(file_name: &str, prefix: &str) -> Option<i64> {
    if !file_name.starts_with(prefix) || !file_name.to_ascii_lowercase().ends_with(".ts") {
        return None;
    }
    let body = &file_name[prefix.len()..file_name.len() - 3];
    body.parse().ok()
}

fn is_sequence_island(
    dense: bool,
    sequence_prefix: Option<&str>,
    segments: &[MediaSegment],
    group: &ManifestGroup,
    short: bool,
) -> bool {
    let Some(prefix) = sequence_prefix else {
        return false;
    };
    if !dense || group.count < 2 || !short {
        return false;
    }
    let numbers: Vec<Option<i64>> = group
        .segments
        .iter()
        .map(|s| trailing_number(&s.file_name, prefix))
        .collect();
    let first = numbers.first().copied().flatten();
    let last = numbers.last().copied().flatten();
    let previous = if group.start_segment_index > 0 {
        trailing_number(&segments[group.start_segment_index - 1].file_name, prefix)
    } else {
        None
    };
    let following = if group.end_segment_index + 1 < segments.len() {
        trailing_number(&segments[group.end_segment_index + 1].file_name, prefix)
    } else {
        None
    };

    let linear = numbers.iter().all(|n| n.is_some())
        && numbers.windows(2).all(|w| match (w[0], w[1]) {
            (Some(a), Some(b)) => b == a + 1,
            _ => false,
        });

    match (previous, following, first, last) {
        (Some(prev), Some(follow), Some(f), Some(l)) => {
            linear
                && follow == prev + 1
                && (f - prev).abs() > 1000
                && (l - follow).abs() > 1000
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skips_without_discontinuity() {
        let content = r#"#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-ENDLIST
#EXTINF:10.0,
seg0.ts
#EXTINF:10.0,
seg1.ts
"#;
        let result = filter_media_playlist(content, false);
        assert_eq!(result.status, FilterStatus::Unchanged);
        assert_eq!(result.reason, Some("no_discontinuity"));
    }

    #[test]
    fn removes_strong_path_ad_group() {
        let content = r#"#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
https://cdn.example.com/movie/seg0.ts
#EXTINF:10.0,
https://cdn.example.com/movie/seg1.ts
#EXTINF:10.0,
https://cdn.example.com/movie/seg2.ts
#EXTINF:10.0,
https://cdn.example.com/movie/seg3.ts
#EXTINF:10.0,
https://cdn.example.com/movie/seg4.ts
#EXTINF:10.0,
https://cdn.example.com/movie/seg5.ts
#EXT-X-DISCONTINUITY
#EXTINF:5.0,
https://cdn.example.com/ads/ad0.ts
#EXTINF:5.0,
https://cdn.example.com/ads/ad1.ts
#EXT-X-DISCONTINUITY
#EXTINF:10.0,
https://cdn.example.com/movie/seg6.ts
#EXTINF:10.0,
https://cdn.example.com/movie/seg7.ts
#EXTINF:10.0,
https://cdn.example.com/movie/seg8.ts
#EXTINF:10.0,
https://cdn.example.com/movie/seg9.ts
#EXTINF:10.0,
https://cdn.example.com/movie/seg10.ts
#EXTINF:10.0,
https://cdn.example.com/movie/seg11.ts
#EXT-X-ENDLIST
"#;
        let result = filter_media_playlist(content, false);
        assert_eq!(result.status, FilterStatus::Filtered);
        assert!(!result.content.contains("/ads/"));
        assert!(result.content.contains("seg0.ts"));
        assert!(result.content.contains("seg6.ts"));
        assert!(result.content.contains("#EXT-X-ENDLIST"));
    }

    #[test]
    fn skips_live_playlist() {
        let content = r#"#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
a.ts
#EXT-X-DISCONTINUITY
#EXTINF:5.0,
https://x/ads/b.ts
"#;
        let result = filter_media_playlist(content, false);
        assert_eq!(result.status, FilterStatus::Unsupported);
        assert_eq!(result.reason, Some("live_or_incomplete_playlist"));
    }
}
