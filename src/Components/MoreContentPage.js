import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './MoreContentPage.module.css';
import Navbar from './Navbar';
import { ReactComponent as ContentIcon } from "../assets/Content.svg";
import { useNavigate, useLocation } from 'react-router-dom';
import { getDailyMotivation, showOtherContent, getProSelection } from '../services/contentService';

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
  const [selection, setSelection] = useState(null);
  const [userId, setUserId] = useState(null);
  const location = useLocation();

  // current video index
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  // refs for each video element
  const videoRefs = [useRef(null), useRef(null), useRef(null)];

  // play/mute state for each video (so labels can update)
  const [isPlaying, setIsPlaying] = useState([false, false, false]);
  const [isMuted, setIsMuted] = useState([false, false, false]);

  // loading / error flags per video
  const [videoLoadedFlags, setVideoLoadedFlags] = useState([false, false, false]);
  const [videoFailedFlags, setVideoFailedFlags] = useState([false, false, false]);

  // quotes modal
  const [quotesModalOpen, setQuotesModalOpen] = useState(false);
  const [moreQuotesList, setMoreQuotesList] = useState([]);

  // article state
  const [currentArticle, setCurrentArticle] = useState(null);
  const proInnerRef = useRef(null);

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    setUserId(uid || null);
    let cancelled = false;
    async function fetchPro() {
      try {
        const sel = await getProSelection(uid);
        if (cancelled) return;
        setSelection(sel);
        // set initial article (random)
        const amap = sel.articlesMap || {};
        const entries = amap ? Object.entries(amap) : [];
        if (entries.length) {
          const [id, obj] = entries[Math.floor(Math.random() * entries.length)];
          setCurrentArticle({ id, actual_content: obj.actual_content });
        }
      } catch (err) {
        console.error("getProSelection failed", err);
      }
    }
    fetchPro();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const inner = proInnerRef.current;
    if (!inner) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        const left = inner.scrollLeft;
        const width = inner.clientWidth || inner.offsetWidth || 1;
        const idx = Math.round(left / width);
        if (idx !== currentVideoIndex) setCurrentVideoIndex(idx);
        ticking = false;
      });
      ticking = true;
    };
    inner.addEventListener('scroll', onScroll, { passive: true });
    return () => inner.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, proInnerRef]);

  // reset flags when selection changes
  useEffect(() => {
    setCurrentVideoIndex(0);
    setIsPlaying([false, false, false]);
    setIsMuted([false, false, false]);
    setVideoLoadedFlags([false, false, false]);
    setVideoFailedFlags([false, false, false]);
  }, [selection]);

  // Enforce only the current video plays; others are paused + muted
  useEffect(() => {
    if (!selection || !selection.videos) return;
    videoRefs.forEach((rf, idx) => {
      const el = rf && rf.current;
      if (!el) return;
      if (idx === currentVideoIndex) {
        // Try to play current video and restore its mute state (if we tracked it)
        const shouldBeMuted = isMuted[idx] === true;
        el.muted = !!shouldBeMuted;
        el.play().then(() => {
          setIsPlaying(prev => { const c = prev.slice(); c[idx] = true; return c; });
        }).catch(() => {
          // autoplay blocked — ensure it's muted and try
          el.muted = true;
          el.play().then(() => {
            setIsPlaying(prev => { const c = prev.slice(); c[idx] = true; return c; });
            setIsMuted(prev => { const c = prev.slice(); c[idx] = true; return c; });
          }).catch(()=> {
            // cannot autoplay — remain paused
            setIsPlaying(prev => { const c = prev.slice(); c[idx] = false; return c; });
          });
        });
      } else {
        // Pause and mute all non-current videos
        try { el.pause(); } catch(e) {}
        try { el.muted = true; } catch(e) {}
        setIsPlaying(prev => { const c = prev.slice(); c[idx] = false; return c; });
        setIsMuted(prev => { const c = prev.slice(); c[idx] = true; return c; });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideoIndex, selection]);

  // Auto-start first video when selection becomes available; also ensure sequential play continues.
  useEffect(() => {
    if (!selection || !selection.videos || !selection.videos.length) return;

    // try to start the first video (index 0)
    const tryPlayIndex = async (i) => {
      const ref = videoRefs[i] && videoRefs[i].current;
      if (!ref) return;
      try {
        ref.muted = false;
        await ref.play();
        // if succeeded, mark as playing
        setIsPlaying(prev => { const c = prev.slice(); c[i] = true; return c; });
        setIsMuted(prev => { const c = prev.slice(); c[i] = ref.muted; return c; });
        setCurrentVideoIndex(i);
      } catch (err) {
        try {
          // fallback: mute and try again
          ref.muted = true;
          await ref.play();
          setIsPlaying(prev => { const c = prev.slice(); c[i] = true; return c; });
          setIsMuted(prev => { const c = prev.slice(); c[i] = true; return c; });
          setCurrentVideoIndex(i);
        } catch (err2) {
          // if still fails, leave paused — user must interact
          console.warn('Auto-play failed for pro video:', err2);
        }
      }
    };

    // small stagger so DOM refs exist
    setTimeout(() => {
      tryPlayIndex(0);
    }, 250);
  }, [selection]);

  // when a video can play, update flags
  const makeOnVideoLoaded = (i) => () => {
    setVideoLoadedFlags(prev => { const c = prev.slice(); c[i] = true; return c; });
  };
  const makeOnVideoError = (i) => () => {
    setVideoFailedFlags(prev => { const c = prev.slice(); c[i] = true; return c; });
  };

  // handle ended: advance to next (do not loop individual video)
  useEffect(() => {
    const curRef = videoRefs[currentVideoIndex] && videoRefs[currentVideoIndex].current;
    if (!curRef) return;
    const onEnded = () => {
      const next = (currentVideoIndex + 1) % 3;
      // pause current explicitly and update state
      try { curRef.pause(); } catch (e) {}
      setIsPlaying(prev => { const c = prev.slice(); c[currentVideoIndex] = false; return c; });

      setCurrentVideoIndex(next);
      // scroll container to next (smooth)
      const parent = curRef.parentElement && curRef.parentElement.parentElement; // .pro-videos-inner
      if (parent) {
        parent.scrollTo({ left: next * parent.clientWidth, behavior: 'smooth' });
      }
      // attempt to play next and update state flags
      setTimeout(async () => {
        const nextRef = videoRefs[next].current;
        if (nextRef) {
          try {
            nextRef.muted = false;
            await nextRef.play();
            setIsPlaying(prev => { const c = prev.slice(); c[next] = true; return c; });
            setIsMuted(prev => { const c = prev.slice(); c[next] = false; return c; });
          } catch (err) {
            try {
              nextRef.muted = true;
              await nextRef.play();
              setIsPlaying(prev => { const c = prev.slice(); c[next] = true; return c; });
              setIsMuted(prev => { const c = prev.slice(); c[next] = true; return c; });
            } catch (err2) {
              console.warn("Auto-play next video failed", err2);
            }
          }
        }
      }, 300);
    };
    curRef.addEventListener('ended', onEnded);
    return () => curRef.removeEventListener('ended', onEnded);
  }, [currentVideoIndex, videoRefs]);

  // keep playing state in sync with element events
  useEffect(() => {
    // add play/pause listeners for each video to update labels
    const listeners = [];
    videoRefs.forEach((r, idx) => {
      const el = r.current;
      if (!el) return;
      const onPlay = () => setIsPlaying(prev => { const c = prev.slice(); c[idx] = true; return c; });
      const onPause = () => setIsPlaying(prev => { const c = prev.slice(); c[idx] = false; return c; });
      const onVolumeChange = () => setIsMuted(prev => { const c = prev.slice(); c[idx] = el.muted; return c; });
      el.addEventListener('play', onPlay);
      el.addEventListener('pause', onPause);
      el.addEventListener('volumechange', onVolumeChange);
      listeners.push({ el, onPlay, onPause, onVolumeChange });
    });
    return () => {
      listeners.forEach(({ el, onPlay, onPause, onVolumeChange }) => {
        el.removeEventListener('play', onPlay);
        el.removeEventListener('pause', onPause);
        el.removeEventListener('volumechange', onVolumeChange);
      });
    };
  }, [selection]);

  // Toggle play/pause for the current video and update state
  const togglePlayPauseCurrent = () => {
    const cur = videoRefs[currentVideoIndex] && videoRefs[currentVideoIndex].current;
    if (!cur) return;
    if (cur.paused) {
      cur.play().then(() => {
        setIsPlaying(prev => { const c = prev.slice(); c[currentVideoIndex] = true; return c; });
      }).catch(() => {
        // if play fails, ensure state shows paused
        setIsPlaying(prev => { const c = prev.slice(); c[currentVideoIndex] = false; return c; });
      });
    } else {
      try { cur.pause(); } catch(e) {}
      setIsPlaying(prev => { const c = prev.slice(); c[currentVideoIndex] = false; return c; });
    }
  };

  // Toggle mute/unmute for the current video and update state
  const toggleMuteCurrent = () => {
    const cur = videoRefs[currentVideoIndex] && videoRefs[currentVideoIndex].current;
    if (!cur) return;
    cur.muted = !cur.muted;
    setIsMuted(prev => { const c = prev.slice(); c[currentVideoIndex] = cur.muted; return c; });
  };

  // user can manually select a video by clicking the small thumbnail area (optional)
  const goToVideo = (i) => {
    const parent = videoRefs[0].current && videoRefs[0].current.parentElement.parentElement;
    if (parent) {
      parent.scrollTo({ left: i * parent.clientWidth, behavior: 'smooth' });
    }
    setCurrentVideoIndex(i);

    // ensure effect will try to play this video (effect above will handle it)
  };

  // More Quotes -> show 5 random quotes (closeable)
  const handleShowMoreQuotes = async () => {
    const quotesMap = await showOtherContent('quote');
    const entries = quotesMap ? Object.entries(quotesMap) : [];
    const n = Math.min(5, entries.length);
    const pick = [];
    const copy = entries.slice();
    while (pick.length < n && copy.length) {
      const idx = Math.floor(Math.random() * copy.length);
      const [id, obj] = copy.splice(idx, 1)[0];
      pick.push({ id, actual_content: obj.actual_content });
    }
    setMoreQuotesList(pick);
    setQuotesModalOpen(true);
  };

  useEffect(() => {
    if (location.state && location.state.openQuotes) {
      window.history.replaceState({ ...location.state, openQuotes: false }, '');
      handleShowMoreQuotes();
    }
  }, []);

  // More article -> pick another random one from selection.articlesMap
  const handleMoreArticle = () => {
    if (!selection || !selection.articlesMap) return;
    const entries = Object.entries(selection.articlesMap || {});
    if (!entries.length) return;
    const [id, obj] = entries[Math.floor(Math.random() * entries.length)];
    setCurrentArticle({ id, actual_content: obj.actual_content });
    // scroll down to article
    setTimeout(() => {
      const art = document.querySelector('.article-section');
      if (art) art.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  };

  return (
    <div className={styles["content-card"]}>
      <div className={styles["content-title"]}>Today's Picks</div>

      {/* VIDEOS ROW */}
      <div className={styles["pro-videos-row"]}>
        {selection && selection.videos && selection.videos.length ? (
          <div className={styles["pro-videos-inner"]} ref={proInnerRef}>
            {selection.videos.map((v, i) => (
              <div key={i} className={styles["pro-video-item"]}>
                <video
                  ref={videoRefs[i]}
                  src={v.url}
                  className={styles["pro-video"]}
                  // do not loop here so 'ended' fires; we auto-advance in code
                  playsInline
                  preload="metadata"
                  onCanPlay={makeOnVideoLoaded(i)}
                  onError={makeOnVideoError(i)}
                />
                {(!videoLoadedFlags[i] && !videoFailedFlags[i]) && (
                  <div className={styles["video-loader-overlay-small"]}>
                    <div className={styles["spinner-small"]}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles["motivation-empty"]}>No videos available</div>
        )}

        {/* controls for current video (labels reflect actual state) */}
        <div className={styles["pro-video-controls"]}>
          <button
            className={styles["control-btn"]}
            onClick={togglePlayPauseCurrent}
          >
            {isPlaying[currentVideoIndex] ? 'Pause' : 'Play'}
          </button>

          <button
            className={styles["control-btn"]}
            onClick={toggleMuteCurrent}
          >
            {isMuted[currentVideoIndex] ? 'Unmute' : 'Mute'}
          </button>
        </div>
      </div>

      {/* IMAGES row: 3 images, each centered and maintaining aspect ratio */}
      <div className={styles["pro-images-row"]}>
        {(selection && selection.images && selection.images.length) ? (
          selection.images.map((img, idx) => (
            <div key={idx} className={styles["pro-image-item"]}>
              <img src={img.url} alt={`image-${idx}`} className={styles["pro-image-centered"]} />
            </div>
          ))
        ) : <div className={styles["motivation-empty"]}>No images</div>}
      </div>

      {/* Heading + Quote of the Day and More Quotes button directly underneath */}
      <div className={styles["quote-section-pro"]}>
        <div className={styles["section-heading"]}>Today's Quote</div>

        <div className={styles["quote-box-pro"]}>
          <div className={styles["quote-mark"]} aria-hidden>“</div>
          <div className={styles["quote-text"]}>{selection && selection.quote ? selection.quote.actual_content : 'No quote available'}</div>
        </div>

        <div className={styles["more-quotes-row"]}>
          <button className={styles["btn-primary"]} onClick={handleShowMoreQuotes}>More Quotes</button>
        </div>
      </div>

      {/* Daily Article with improved CSS */}
      <div className={`${styles["article-section"]} article-section`}>
        <div className={styles["article-title"]}>Daily Article</div>
        {currentArticle ? (
          <div className={styles["article-card"]}>
            <div className={styles["article-text-full"]}>{currentArticle.actual_content}</div>
          </div>
        ) : <div className={styles["motivation-empty"]}>No article</div>}
        <div style={{ marginTop: 12 }}>
          <button className={styles["btn-primary"]} onClick={handleMoreArticle}>More Article</button>
        </div>
      </div>

      {/* Quotes modal */}
      {quotesModalOpen && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal-content"]}>
            <h3>More quotes</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {moreQuotesList.map((q, i) => (
                <blockquote key={i} className={styles["motivation-quote"]}>{q.actual_content}</blockquote>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button className={styles["btn-secondary"]} onClick={() => setQuotesModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
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