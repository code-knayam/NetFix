(() => {
  let videoPlayer: HTMLVideoElement | null,
    videoBody,
    timerElement: HTMLElement | null;
  let settings: any = null;
  let listnerSetup = false;
  let nextBtnMutationObserver1: MutationObserver | null = null;
  let nextBtnMutationObserver2: MutationObserver | null = null;
  let videoMutationObserver: MutationObserver | null = null;

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type } = obj;

    switch (type) {
      case 'NEW_VIDEO':
        initExtension();
        break;
      case 'BLOCK_PLAYBACK':
        blockPlayback();
        break;
      case 'HIDE_RECOMMENDATIONS':
        hideRecommendations();
        break;
      case 'SEARCH_PAGE':
        hideRecommendationsOverlay();
        break;
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes['netflixSettings']) {
      settings = changes['netflixSettings'].newValue;
      applyUpdatedSettings();
    }
  });

  const getSettings = async () => {
    settings = (await chrome.storage.sync.get('netflixSettings'))[
      'netflixSettings'
    ];
  };

  const initExtension = async () => {
    await getSettings();
    hideRecommendations();
    initVideoPlayer();
    videoMutationObserver = setupMutationObserver(
      initVideoPlayer,
      '.watch-video video'
    );
  };

  const initVideoPlayer = () => {
    videoPlayer = document.querySelector('.watch-video video');

    if (!videoPlayer) return;

    videoMutationObserver?.disconnect();
    renderVideoEndTimer();
    setupVideListeners();
    handleNextEpisodeButton();
  };

  const renderVideoEndTimer = () => {
    if (!settings.showEndTime) {
      return;
    }

    const timerElementExists = document.getElementById('netfix-timer');

    if (!timerElementExists) {
      timerElement = document.createElement('div');
      timerElement.id = 'netfix-timer';
      timerElement.className = 'netfix-timer';
      updateVideoEndTimer();

      videoBody = document.getElementsByClassName('watch-video')[0];

      if (videoBody) {
        videoBody.appendChild(timerElement);
      }
    }
  };

  const getEndTime = () => {
    if (!videoPlayer) return;

    const diff = videoPlayer.duration - videoPlayer.currentTime;
    const newDate = new Date();

    newDate.setSeconds(newDate.getSeconds() + diff);

    return newDate.toLocaleTimeString();
  };

  const updateVideoEndTimer = () => {
    if (!timerElement) return;
    timerElement.textContent = `Episode ends at ${getEndTime()}`;
  };

  const setupVideListeners = () => {
    if (!videoPlayer || listnerSetup) return;

    listnerSetup = true;

    // Add timeupdate listener to detect actual playback
    let hasStartedPlaying = false;
    const timeUpdateListener = () => {
      if (!hasStartedPlaying && !videoPlayer?.paused && videoPlayer?.currentTime && videoPlayer?.currentTime > 0) {
        hasStartedPlaying = true;
        updateVideoEndTimer();
        chrome.runtime.sendMessage({ action: 'WATCHING_STARTED' });
        videoPlayer.removeEventListener('timeupdate', timeUpdateListener);
      }
    };

    videoPlayer.addEventListener('timeupdate', timeUpdateListener);

    videoPlayer.addEventListener('seeked', (e) => {
        updateVideoEndTimer();
    });

    videoPlayer.addEventListener('ended', (e) => {
        hasStartedPlaying = false;
        chrome.runtime.sendMessage({ action: 'WATCHING_STOPPED' });
    });

    videoPlayer.addEventListener('pause', (e) => {
        chrome.runtime.sendMessage({ action: 'WATCHING_PAUSED' });
    });

    videoPlayer.addEventListener('play', (e) => {
        updateVideoEndTimer();
        chrome.runtime.sendMessage({ action: 'WATCHING_STARTED' });
    });
  };

  const removeElement = (element: Element | null) => {
    if (element) {
      element.remove();
    }
  };

  const handleNextEpisodeButton = () => {
    if (!settings.disableAutoplay) {
      return;
    }

    const nextEpisodeBtnEle = document.querySelector(
      '[data-uia="next-episode-seamless-button"]'
    );
    const nextEpisodeBtnEle2 = document.querySelector(
      '[data-uia="next-episode-seamless-button-draining"]'
    );

    removeElement(nextEpisodeBtnEle);
    removeElement(nextEpisodeBtnEle2);

    nextBtnMutationObserver1 = setupMutationObserver(
      removeElement.bind(nextEpisodeBtnEle),
      "[data-uia='next-episode-seamless-button']"
    );
    nextBtnMutationObserver2 = setupMutationObserver(
      removeElement.bind(nextEpisodeBtnEle2),
      "[data-uia='next-episode-seamless-button-draining']"
    );
  };

  const setupMutationObserver = (callBack: Function, element: string) => {
    let videoObserver = new MutationObserver((mutations) => {
      callBack();
    });

    videoObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return videoObserver;
  };

  const blockPlayback = () => {
    if (videoPlayer) {
      videoPlayer.pause();

      const overlayPresnet = document.querySelector('.netflix-block-overlay');

      if (overlayPresnet) {
        return;
      }

      // Create blocking overlay
      const overlay = document.createElement('div');
      overlay.className = 'netflix-block-overlay';
      overlay.innerHTML = `
            <div class="netflix-block-message">
              <img src="https://code-knayam.github.io/NetFix/src/netfix-logo.png" alt="NetFix Logo" width="100" height="100" />
              <h2>Viewing limit reached</h2>
              <p>You've reached your Netflix viewing limit for today.</p>
              <p>Take a break and come back tomorrow!</p>
            </div>
          `;
      document.body.appendChild(overlay);
    }
  };

  const hideRecommendations = () => {
    if (!settings.hideRecommendations) {
      return;
    }

    const mainViewEle = document.querySelector('.mainView');

    if (!mainViewEle) return;

    const nextFixStyleEle = document.querySelector('#netfix-block-style');
    if (!nextFixStyleEle) {
      const style = document.createElement('style');
      style.id = 'netfix-block-style';
      style.textContent = `
            .mainView:not(:has([data-uia="search-page"])) .billboard-row,
            .mainView:not(:has([data-uia="search-page"])) .lolomoRow:not(.lolomoRow_title_card),
            .mainView:not(:has([data-uia="search-page"])) .evidence-overlay,
            .mainView:not(:has([data-uia="search-page"])) .ptrack-content {
                display: none !important;
            }
            `;
      document.head.appendChild(style);
    }

    const nextFixContainerEle = document.querySelector(
      '#netfix-block-container'
    );
    if (nextFixContainerEle) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'netfix-block-container';
    overlay.style.height = '100vh';
    overlay.style.width = '100vw';
    overlay.innerHTML = `
                  <div class="netflix-block-message">
                    <img src="https://code-knayam.github.io/NetFix/src/netfix-logo.png" alt="NetFix Logo" width="100" height="100" />
                    <h2>Recommendations blocked</h2>
                    <p>Mindful watching is important.</p>
                    <p>Dont let the recommendations distract you.</p>
                  </div>
                `;

    mainViewEle?.insertBefore(overlay, mainViewEle.firstChild);
  };

  const hideRecommendationsOverlay = () => {
    const nextFixContainerEle = document.querySelector(
      '#netfix-block-container'
    );
    removeElement(nextFixContainerEle);
  };

  const applyUpdatedSettings = () => {
    if (!settings) return;

    //based on settings, apply changes, if false remove the element
    if (settings.hideRecommendations) {
      hideRecommendations();
    } else {
      const blockStyle = document.querySelector('#netfix-block-style');
      const blockContainer = document.querySelector('#netfix-block-container');
      removeElement(blockStyle);
      removeElement(blockContainer);
    }

    if (settings.showEndTime) {
      renderVideoEndTimer();
    } else {
      const timerElement = document.querySelector('#netfix-timer');
      removeElement(timerElement);
    }

    if (settings.disableAutoplay) {
      handleNextEpisodeButton();
    } else {
      nextBtnMutationObserver1?.disconnect();
      nextBtnMutationObserver2?.disconnect();
    }
  };

  initExtension();
})();
