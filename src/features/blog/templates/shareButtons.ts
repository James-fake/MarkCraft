import { BlogPost } from './types'
import { escapeJsString } from './utils'

export function generateShareButtons(post: BlogPost, siteUrl: string, bl: 'zh' | 'en' = 'zh'): string {
  const url = encodeURIComponent(`${siteUrl}/posts/${post.slug}/`)
  const title = encodeURIComponent(post.title)
  const rawUrl = `${siteUrl}/posts/${post.slug}/`
  return `<div class="share-buttons">
  <span class="share-label">${bl === 'en' ? 'Share:' : '分享：'}</span>
  <a href="https://twitter.com/intent/tweet?url=${url}&text=${title}" target="_blank" rel="noopener" class="share-btn" title="Twitter">
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  </a>
  <a href="https://service.weibo.com/share/share.php?url=${url}&title=${title}" target="_blank" rel="noopener" class="share-btn" title="${bl === 'en' ? 'Weibo' : '微博'}">
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg>
  </a>
  <a href="https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${url}&title=${title}" target="_blank" rel="noopener" class="share-btn" title="${bl === 'en' ? 'Qzone' : 'QQ空间'}">
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
  </a>
  <a href="https://t.me/share/url?url=${url}&text=${title}" target="_blank" rel="noopener" class="share-btn" title="Telegram">
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
  </a>
  <a href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noopener" class="share-btn" title="LinkedIn">
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>
  </a>
  <button class="share-btn" title="${bl === 'en' ? 'WeChat' : '微信'}" onclick="var e=document.getElementById('wechat-qr-modal');if(e){e.style.display='flex';var img=e.querySelector('img');if(img&&!img.src){img.src='https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(rawUrl)}';}}">
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.328.328 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-3.04-5.91-6.854-6.124h-.208zm-2.513 2.99c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/></svg>
  </button>
  <button class="share-btn" title="${bl === 'en' ? 'Copy link' : '复制链接'}" onclick="navigator.clipboard.writeText('${escapeJsString(rawUrl)}').then(()=>{this.textContent='✓';setTimeout(()=>this.innerHTML='<svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' width=\\'16\\' height=\\'16\\'><rect x=\\'9\\' y=\\'9\\' width=\\'13\\' height=\\'13\\' rx=\\'2\\'/><path d=\\'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1\\'/></svg>'},1500)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
  </button>
</div>
<div id="wechat-qr-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;cursor:pointer;" onclick="this.style.display='none'">
  <div style="background:#fff;padding:20px;border-radius:12px;text-align:center;" onclick="event.stopPropagation()">
    <p style="margin-bottom:12px;font-size:14px;color:#333;">${bl === 'en' ? 'Scan to share on WeChat' : '微信扫一扫分享'}</p>
    <img src="" alt="QR Code" style="width:200px;height:200px;border-radius:8px;" onload="this.style.opacity=1" style="opacity:0;transition:opacity 0.3s">
  </div>
</div>`
}

export function getShareStyles(): string {
  return `
    .share-buttons { display: flex; align-items: center; gap: 8px; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-color); }
    .share-label { font-size: 0.85em; color: var(--text-muted); font-weight: 500; }
    .share-btn { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-color); color: var(--text-secondary); background: var(--bg-card); cursor: pointer; transition: all 0.2s; text-decoration: none; }
    .share-btn:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-2px); }
  `
}
