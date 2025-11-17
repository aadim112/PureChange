import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './MoreContentPage.module.css';
import Navbar from './Navbar';
import { ReactComponent as ContentIcon } from "../assets/Content.svg";
import { useNavigate, useLocation } from 'react-router-dom';
import { getDailyMotivation } from '../services/contentService';
import { showOtherContent } from '../services/contentService';

function DefaultVariant() {
  const [selection, setSelection] = useState(null);
  const [userId, setUserId] = useState(null);

  // media load tracking
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const loaderTimeoutRef = useRef(null);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    setUserId(uid || null);

    let cancelled = false;

    async function fetchDaily() {
      try {
        const sel = await getDailyMotivation(uid);
        if (cancelled) return;
        setSelection(sel);

        // if article missing full content, try to fetch
        if (sel && sel.article && !sel.article.actual_content) {
          const articles = await showOtherContent('article');
          const a = (articles && articles[sel.article.id]) ? articles[sel.article.id].actual_content : null;
          if (!cancelled) setSelection(prev => ({ ...prev, article: { ...prev.article, actual_content: a } }));
        }
      } catch (err) {
        console.error("Failed to load daily motivation:", err);
      }
    }

    fetchDaily();

    // safety timeout for video loader only (in case video never resolves)
    loaderTimeoutRef.current = setTimeout(() => {
      if (!cancelled) {
        setVideoLoaded(true);
      }
    }, 15000);

    return () => {
      cancelled = true;
      clearTimeout(loaderTimeoutRef.current);
    };
  }, []);

  // When selection changes, reset load flags and try autoplay video
  useEffect(() => {
    setImageLoaded(false);
    setVideoLoaded(false);
    setImageFailed(false);
    setVideoFailed(false);

    const needVideo = !!(selection && selection.video && selection.video.url);

    const tryPlayVideo = async () => {
      const el = videoRef.current;
      if (!el) return;
      try {
        el.muted = false;
        await el.play();
      } catch (err) {
        // autoplay blocked — mute and try again
        try {
          el.muted = true;
          await el.play();
        } catch (err2) {
          // fallback: user click required
          console.warn("Autoplay failed", err2);
        }
      }
    };

    if (needVideo) {
      // small delay so ref attached
      setTimeout(() => {
        tryPlayVideo();
      }, 200);
    }
  }, [selection]);

  // handlers for image/video events
  const onImageLoad = () => {
    setImageLoaded(true);
  };
  const onImageError = () => {
    setImageFailed(true);
  };
  const onVideoCanPlay = () => {
    setVideoLoaded(true);
  };
  const onVideoError = () => {
    setVideoFailed(true);
  };

  // custom controls for video: play/pause and mute toggle
  const togglePlayPause = async () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
      } catch (err) {
        console.warn("Play failed", err);
      }
    } else {
      el.pause();
    }
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    // force re-render to update label (simple approach)
    // no state used; reading current properties when rendering controls is fine
  };

  return (
    <>
      <div className={styles["content-card"]}>
        <div className={styles["content-title"]}>Today's Motivation</div>

        {/* VIDEO - full width with loader inside video block */}
        <div className={styles["video-wrapper"]}>
          {selection && selection.video && selection.video.url ? (
            <div className={styles["video-container"]}>
              <video
                ref={videoRef}
                className={styles["full-video"]}
                src={selection.video.url}
                loop
                playsInline
                preload="metadata"
                onCanPlay={onVideoCanPlay}
                onError={onVideoError}
                poster={selection.image ? selection.image.url : undefined}
              />
              {/* show loader overlay inside the video block while the video is loading */}
              {(!videoLoaded && !videoFailed) && (
                <div className={styles["video-loader-overlay"]}>
                  <div className={styles["spinner"]}></div>
                </div>
              )}
              <div className={styles["video-controls"]}>
                <button className={styles["control-btn"]} onClick={togglePlayPause} aria-label="Play Pause">
                  {videoRef.current && !videoRef.current.paused ? 'Pause' : 'Play'}
                </button>
                <button className={styles["control-btn"]} onClick={toggleMute} aria-label="Mute Unmute">
                  {videoRef.current && videoRef.current.muted ? 'Unmute' : 'Mute'}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles["motivation-empty"]}>No video available</div>
          )}
        </div>

        {/* IMAGE + QUOTE row: quote vertically centered with image */}
        <div className={styles["image-quote-row"]}>
          <div className={styles["image-col"]}>
            {selection && selection.image && selection.image.url ? (
              <div className={styles["image-wrapper"]}>
                <img
                  ref={imageRef}
                  src={selection.image.url}
                  alt="Motivational"
                  className={styles["motivation-media-image-full"]}
                  onLoad={onImageLoad}
                  onError={onImageError}
                  draggable={false}
                />
              </div>
            ) : (
              <div className={styles["motivation-empty"]}>No image available</div>
            )}
          </div>

          <div className={styles["quote-col"]}>
            {selection && selection.quote && selection.quote.actual_content ? (
              <div className={styles["quote-box"]}>
                <div className={styles["quote-mark"]} aria-hidden>“</div>
                <div className={styles["quote-text"]}>{selection.quote.actual_content}</div>
                <div className={styles["quote-author"]}></div>
              </div>
            ) : (
              <div className={styles["motivation-empty"]}>No quote available</div>
            )}
          </div>
        </div>

        {/* ARTICLE full text */}
        <div className={styles["article-section"]}>
          <div className={styles["article-title"]}>Article</div>
          {selection && selection.article && selection.article.actual_content ? (
            <div className={styles["article-text-full"]}>
              {selection.article.actual_content}
            </div>
          ) : (
            <div className={styles["motivation-empty"]}>No article available</div>
          )}
        </div>
      </div>
    </>
  );
}

function ProVariant() {
  return (
    <>
      <div className={styles["content-card"]}>
        <div className={styles["content-title"]}>General Content</div>

        <div className={styles["info-card"]}>
          <div className={styles["info-content"]}>
            <div className={styles["info-label"]}>Featured Videos</div>
            <div>Handpicked clips for beginners and daily practice.</div>
          </div>
        </div>

        <div className={styles["cards"]}>
          <div className={styles["info-card"]}>
            <div className={styles["info-content"]}>
              <div className={styles["info-label"]}>Daily Quotes</div>
              <div>Short motivational lines to get you started.</div>
            </div>
          </div>
          <div className={styles["info-card"]}>
            <div className={styles["info-content"]}>
              <div className={styles["info-label"]}>Image Gallery</div>
              <div>Visual aids and posters to stay focused.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EliteVariant() {
  return (
    <div className={styles["content-card"]}>
      <div className={styles["content-title"]}>Elite</div>
      <div style={{ padding: 24, textAlign: 'center', fontSize: 18 }}>Coming Soon!</div>
    </div>
  );
}

export default function MoreContentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const variant = useMemo(() => {
    if (location && location.state && typeof location.state.variant === 'string') {
      return location.state.variant.toLowerCase();
    }
    try {
      const params = new URLSearchParams(location.search || window.location.search);
      const q = params.get('variant');
      if (q) return q.toLowerCase();
    } catch (e) {
      // ignore and fallback
    }
    return 'default';
  }, [location]);

  let Rendered;
  if (variant === 'pro') Rendered = <ProVariant />;
  else if (variant === 'elite') Rendered = <EliteVariant />;
  else Rendered = <DefaultVariant />;

  return (
    <div className={styles["more-content-page"]}>
      <Navbar
        pageName="More Content"
        Icon={ContentIcon}
        buttons={[
          { label: "Activity", variant: "secondary", route: "/activity" },
          { label: "Content", variant: "secondary", route: "/content" },
        ]}
      />

      <div className={styles["main-content"]}>
        {Rendered}
      </div>
    </div>
  );
}
