import React, { useState } from 'react';

interface VideoInfo {
  contentId: string;
  title: string;
  viewCounter: number;
  commentNum: number;
  mylistCounter: number;
  startTime: string;
  thumbnailUrl: string;
  userNickname: string;
  length: string;
}

type SortKey = 'viewCounter' | 'startTime' | 'mylistCounter' | 'commentNum';
type SortOrder = 'asc' | 'desc';

export default function App() {
  const [inputData, setInputData] = useState('');
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [sortKey, setSortKey] = useState<SortKey>('viewCounter');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 動画IDの抽出
  const extractVideoIds = (text: string): string[] => {
    const regex = /(?:https?:\/\/(?:www\.|sp\.)?nicovideo\.jp\/watch\/)?([a-z]{2}\d+|\d+)/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      let id = match[1];
      if (/^\d+$/.test(id)) id = `sm${id}`;
      matches.push(id);
    }
    return Array.from(new Set(matches));
  };

  // getthumbinfoを1件取得（プロキシ経由）
  // getthumbinfoを1件取得（Cloudflare Workers経由）
  const fetchThumbInfo = async (videoId: string): Promise<VideoInfo | null> => {
    // さっき発行されたWorkersのURLを指定する
    const workerUrl = 'https://nico-proxy.zatto0524.workers.dev';
    const proxyUrl = `${workerUrl}?id=${videoId}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) return null;

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const status = xmlDoc.getElementsByTagName('nicovideo_thumb_response')[0]?.getAttribute('status');
      if (status !== 'ok') return null;

      const getVal = (tag: string) => xmlDoc.getElementsByTagName(tag)[0]?.textContent || '';

      return {
        contentId: videoId,
        title: getVal('title'),
        viewCounter: parseInt(getVal('view_counter'), 10) || 0,
        commentNum: parseInt(getVal('comment_num'), 10) || 0,
        mylistCounter: parseInt(getVal('mylist_counter'), 10) || 0,
        startTime: getVal('first_retrieve'),
        thumbnailUrl: getVal('thumbnail_url'),
        userNickname: getVal('user_nickname'),
        length: getVal('length'),
      };
    } catch (e) {
      console.error(`Failed to fetch ${videoId}:`, e);
      return null;
    }
  };

  // 読み込み実行
  const handleLoad = async () => {
    const ids = extractVideoIds(inputData);
    if (ids.length === 0) {
      alert('有効な動画IDが見つかりませんでした。');
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: ids.length });

    const results: VideoInfo[] = [];
    for (let i = 0; i < ids.length; i++) {
      const info = await fetchThumbInfo(ids[i]);
      if (info) results.push(info);
      setProgress({ current: i + 1, total: ids.length });
    }

    setVideos(results);
    setLoading(false);
  };

  // ソート処理（型安全版）
  const sortedVideos = [...videos].sort((a, b) => {
    let valA: number = sortKey === 'startTime' ? new Date(a.startTime).getTime() : (a[sortKey] as number);
    let valB: number = sortKey === 'startTime' ? new Date(b.startTime).getTime() : (b[sortKey] as number);

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>ニコニコマイリスト・ソーター</h1>
      
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          マイリストのURLや動画ID（sm〜）をテキストエリアに貼り付けてください
        </p>
        <textarea
          rows={5}
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="https://www.nicovideo.jp/watch/sm9&#10;sm1193&#10;sm44839793"
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontFamily: 'monospace' }}
        />
        <button
          onClick={handleLoad}
          disabled={loading}
          style={{
            marginTop: '8px',
            padding: '10px 20px',
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? `取得中... (${progress.current}/${progress.total})` : 'メタデータを取得して読み込む'}
        </button>
      </div>

      {videos.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', background: '#f5f5f5', padding: '12px' }}>
          <span>ソート:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{ padding: '4px' }}
          >
            <option value="viewCounter">再生数</option>
            <option value="startTime">投稿日時</option>
            <option value="mylistCounter">マイリスト数</option>
            <option value="commentNum">コメント数</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            style={{ padding: '4px' }}
          >
            <option value="desc">降順 (多い・新しい順)</option>
            <option value="asc">昇順 (少ない・古い順)</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>全 {videos.length} 件</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedVideos.map((video) => (
          <div
            key={video.contentId}
            style={{
              display: 'flex',
              gap: '12px',
              border: '1px solid #ddd',
              padding: '12px',
              borderRadius: '4px',
              background: '#fff'
            }}
          >
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              style={{ width: '120px', height: '90px', objectFit: 'cover', background: '#eee' }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <a
                  href={`https://www.nicovideo.jp/watch/${video.contentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 'bold', color: '#0066cc', textDecoration: 'none' }}
                >
                  {video.title}
                </a>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  投稿者: {video.userNickname} / 投稿日: {video.startTime.split('T')[0]} / 長さ: {video.length}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
                <span>▶ 再生: {video.viewCounter.toLocaleString()}</span>
                <span>💬 コメント: {video.commentNum.toLocaleString()}</span>
                <span>📁 マイリスト: {video.mylistCounter.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}