/* ==========================================================================
   Boston English Center — Chapter 1 shared lesson engine ("Paying Bills")
   Vanilla JS, no frameworks. Works with or without GSAP (loaded by slides).

   MEDIA POLICY (per tech lead instruction):
   - No media is generated, synthesised or faked here. No speechSynthesis.
   - Audio/video players render in the platform style but stay DISABLED while
     their source URL is empty. Durations show "--:--" until real metadata
     loads. The tech lead supplies hosted files later; see the MEDIA blocks
     inside each slide file — that is the only place a URL needs to be pasted.
   ========================================================================== */
(function () {
    'use strict';

    /* ---------------- theme bootstrap (same contract as chapter-0) ---------------- */
    (function applyInitialTheme() {
        var useDark = false;
        try {
            if (window.parent && window.parent !== window) {
                useDark = window.parent.document.documentElement.classList.contains('dark');
            }
        } catch (e) { /* cross-origin: fall through */ }
        if (!useDark) {
            var saved = null;
            try { saved = localStorage.getItem('theme-preference'); } catch (e) {}
            var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            useDark = saved ? saved === 'dark' : !!prefersDark;
        }
        document.documentElement.classList.toggle('dark', useDark);
    })();

    window.setTheme = function setTheme(theme) {
        var useDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', useDark);
        try { localStorage.setItem('theme-preference', useDark ? 'dark' : 'light'); } catch (e) {}
    };

    /* ---------------- utils ---------------- */
    var BEC = window.BEC = {};

    BEC.el = function (tag, cls, text) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text != null) node.textContent = text;
        return node;
    };

    BEC.icon = function (name) {
        var paths = {
            play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.54-6.86a1.05 1.05 0 0 0 0-1.76L9.56 4.26A1.04 1.04 0 0 0 8 5.14z"/></svg>',
            pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4.4" height="16" rx="1.4"/><rect x="13.6" y="4" width="4.4" height="16" rx="1.4"/></svg>',
            speaker: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
            check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
            close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
            expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4m0 0h5M4 4l5 5M20 9V4m0 0h-5m5 0l-5 5M4 15v5m0 0h5m-5 0l5-5M20 15v5m0 0h-5m5 0l-5-5"/></svg>',
            volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
            image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M4.5 18l4.8-4.8a1.5 1.5 0 0 1 2.1 0l2.1 2.1 2.4-2.4a1.5 1.5 0 0 1 2.1 0L21 16"/></svg>'
        };
        var span = document.createElement('span');
        span.style.display = 'inline-flex';
        span.innerHTML = paths[name] || '';
        return span;
    };

    BEC.fmt = function (seconds) {
        if (seconds == null || !isFinite(seconds) || seconds < 0) seconds = 0;
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    };
    BEC.fmtLong = function (seconds) {
        if (seconds == null || !isFinite(seconds) || seconds < 0) seconds = 0;
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    };

    BEC.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Light entrance: subtle, fast, overflow-safe, optional GSAP. */
    BEC.entrance = function (selector) {
        var nodes = document.querySelectorAll(selector);
        if (!nodes.length) return;
        if (BEC.reduceMotion || !window.gsap) return; // static by default when reduced motion
        if (BEC.entrance._done) return;
        try {
            window.gsap.fromTo(nodes,
                { y: 12, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'power2.out', clearProps: 'transform' });
        } catch (e) { /* never let animation break a slide */ }
    };

    /* ---------------- quiz timer ---------------- */
    BEC.Timer = function (onTick) {
        var t = 0, handle = null;
        function tick() {
            t++;
            onTick(BEC.fmtLong(t));
        }
        return {
            start: function () { if (!handle) handle = setInterval(tick, 1000); },
            stop: function () { if (handle) { clearInterval(handle); handle = null; } },
            reset: function () { this.stop(); t = 0; onTick(BEC.fmtLong(0)); },
            destroy: function () { this.stop(); }
        };
    };

    /* =====================================================================
       AudioBar — platform-style compact audio row.
       Renders disabled ("0:00 / --:--") while `src` is empty. No TTS, no
       fake durations. When the tech lead pastes a hosted URL, controls
       activate and the duration comes from the file's real metadata.
       ===================================================================== */
    BEC.AudioBar = function (container, opts) {
        opts = opts || {};
        var src = opts.src || '';
        var onEnded = opts.onEnded || null;
        var audio = null;      // created lazily, only when a source exists
        var playing = false;

        var root = BEC.el('div', 'bec-audio');
        var playBtn = BEC.el('button', 'bec-audio-play');
        playBtn.type = 'button';
        playBtn.setAttribute('aria-label', 'Play audio');
        playBtn.appendChild(BEC.icon('play'));
        if (!src) {
            // No hosted file yet: the control stays disabled — nothing pretends to play.
            playBtn.disabled = true;
            playBtn.title = 'Audio will be connected when the hosted file is available';
        }
        var track = BEC.el('div', 'bec-audio-track');
        var fill = BEC.el('div', 'bec-audio-fill');
        track.appendChild(fill);
        var time = BEC.el('span', 'bec-audio-time', '0:00 / --:--');
        root.appendChild(playBtn);
        root.appendChild(track);
        root.appendChild(time);
        if (opts.note) {
            var note = BEC.el('span', 'bec-audio-note', opts.note);
            root.appendChild(note);
        }
        container.appendChild(root);

        function setPlaying(state) {
            playing = state;
            playBtn.innerHTML = '';
            playBtn.appendChild(BEC.icon(state ? 'pause' : 'play'));
            playBtn.setAttribute('aria-label', state ? 'Pause audio' : 'Play audio');
        }

        function updateProgress() {
            if (!audio) return;
            var dur = audio.duration;
            var cur = audio.currentTime || 0;
            fill.style.width = (dur ? (cur / dur) * 100 : 0) + '%';
            time.textContent = BEC.fmt(cur) + ' / ' + (dur && isFinite(dur) ? BEC.fmt(dur) : '--:--');
        }

        function ensureAudio() {
            if (audio || !src) return;
            audio = new Audio(src);
            audio.preload = 'metadata';
            audio.addEventListener('timeupdate', updateProgress);
            audio.addEventListener('loadedmetadata', updateProgress);
            audio.addEventListener('ended', function () {
                setPlaying(false);
                fill.style.width = '0%';
                if (onEnded) onEnded();
            });
        }

        playBtn.addEventListener('click', function () {
            if (!src) return; // stays disabled-looking; nothing to fake
            ensureAudio();
            if (playing) {
                audio.pause();
                setPlaying(false);
            } else {
                audio.play().then(function () { setPlaying(true); }).catch(function () { setPlaying(false); });
            }
        });

        return {
            root: root,
            playButton: playBtn,
            hasSource: function () { return !!src; },
            stop: function () {
                if (audio) { audio.pause(); audio.currentTime = 0; updateProgress(); }
                setPlaying(false);
                fill.style.width = '0%';
                if (src) time.textContent = '0:00 / ' + (audio && isFinite(audio.duration) ? BEC.fmt(audio.duration) : '--:--');
            },
            reset: function () { this.stop(); }
        };
    };

    /* =====================================================================
       VideoPlayer — 16:9 black frame in the reference player layout.
       Shows NO thumbnail, NO video source, NO fake duration. Controls are
       visibly disabled until `src` is set by the tech lead, then the custom
       chrome plays/pauses/seeks the hosted file.
       ===================================================================== */
    BEC.VideoPlayer = function (container, opts) {
        opts = opts || {};
        var src = opts.src || '';

        var frame = BEC.el('div', 'bec-video' + (opts.small ? ' bec-video-sm' : ''));
        var video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('disablepictureinpicture', '');
        video.tabIndex = -1; // not focusable while empty — nothing to control
        frame.appendChild(video);

        var center = BEC.el('div', 'bec-video-center');
        var bigPlay = BEC.el('button', 'bec-video-play');
        bigPlay.type = 'button';
        bigPlay.setAttribute('aria-label', 'Play video');
        bigPlay.appendChild(BEC.icon('play'));
        center.appendChild(bigPlay);
        frame.appendChild(center);

        var bar = BEC.el('div', 'bec-video-bar');
        var toggle = BEC.el('button');
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Play');
        toggle.appendChild(BEC.icon('play'));
        var vol = BEC.el('button');
        vol.type = 'button';
        vol.setAttribute('aria-label', 'Mute');
        vol.appendChild(BEC.icon('volume'));
        var trackEl = BEC.el('div', 'bec-video-track');
        var fillEl = BEC.el('div', 'bec-video-fill');
        trackEl.appendChild(fillEl);
        var timeEl = BEC.el('span', 'bec-video-time', '0:00 / --:--');
        var fs = BEC.el('button');
        fs.type = 'button';
        fs.setAttribute('aria-label', 'Fullscreen');
        fs.appendChild(BEC.icon('expand'));
        bar.appendChild(toggle);
        bar.appendChild(vol);
        bar.appendChild(trackEl);
        bar.appendChild(timeEl);
        bar.appendChild(fs);
        frame.appendChild(bar);
        container.appendChild(frame);

        var ready = false;

        function setPlaying(state) {
            toggle.innerHTML = '';
            toggle.appendChild(BEC.icon(state ? 'pause' : 'play'));
            bigPlay.style.display = state ? 'none' : '';
        }

        function update() {
            var dur = video.duration;
            var cur = video.currentTime || 0;
            fillEl.style.width = (dur ? (cur / dur) * 100 : 0) + '%';
            timeEl.textContent = BEC.fmt(cur) + ' / ' + (dur && isFinite(dur) ? BEC.fmt(dur) : '--:--');
        }

        function activate() {
            if (ready) return;
            ready = true;
            video.tabIndex = 0;
            video.src = src; // hosted file connected here — the only place it is assigned
            video.preload = 'metadata';
            video.addEventListener('timeupdate', update);
            video.addEventListener('loadedmetadata', update);
            video.addEventListener('ended', function () { setPlaying(false); update(); });
            [toggle, bigPlay, vol, fs].forEach(function (b) { b.disabled = false; });
        }

        if (src) activate(); else [toggle, bigPlay, vol, fs].forEach(function (b) {
            // No hosted file yet: controls stay disabled — the frame stays an empty black area.
            b.disabled = true;
            b.title = 'The video will be connected when the hosted file is available';
        });

        function togglePlay() {
            if (!ready) return;
            if (video.paused) video.play().catch(function () {});
            else video.pause();
        }
        toggle.addEventListener('click', togglePlay);
        bigPlay.addEventListener('click', togglePlay);
        video.addEventListener('play', function () { setPlaying(true); });
        video.addEventListener('pause', function () { setPlaying(false); update(); });
        trackEl.addEventListener('click', function (e) {
            if (!ready || !isFinite(video.duration)) return;
            var rect = trackEl.getBoundingClientRect();
            video.currentTime = ((e.clientX - rect.left) / rect.width) * video.duration;
        });
        vol.addEventListener('click', function () {
            if (!ready) return;
            video.muted = !video.muted;
            vol.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute');
            vol.style.opacity = video.muted ? '0.4' : '';
        });
        fs.addEventListener('click', function () {
            if (!ready) return;
            if (document.fullscreenElement) document.exitFullscreen();
            else if (frame.requestFullscreen) frame.requestFullscreen();
        });

        return {
            frame: frame,
            hasSource: function () { return !!src; },
            stop: function () {
                if (ready && !video.paused) video.pause();
                if (ready) { video.currentTime = 0; update(); }
                setPlaying(false);
            }
        };
    };

    /* =====================================================================
       ScriptOverlay — compact transcript panel (paginated, never scrolls).
       pages: [ [ {speaker, text, b?}, ... ], ... ]
       ===================================================================== */
    BEC.ScriptOverlay = function (slideRoot, title, pages) {
        var overlay = BEC.el('div', 'bec-overlay');
        var card = BEC.el('div', 'bec-overlay-card');
        var titleEl = BEC.el('h3', 'bec-overlay-title', title);
        var close = BEC.el('button', 'bec-overlay-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Close');
        var body = BEC.el('div', 'bec-script-body');
        var pager = BEC.el('div', 'bec-overlay-pager');
        card.appendChild(titleEl);
        card.appendChild(close);
        card.appendChild(body);
        if (pages.length > 1) card.appendChild(pager);
        overlay.appendChild(card);
        slideRoot.appendChild(overlay);

        var pageIdx = 0;

        function renderPage() {
            body.innerHTML = '';
            pages[pageIdx].forEach(function (line) {
                var row = BEC.el('div', 'bec-script-line');
                var sp = BEC.el('span', 'bec-script-speaker' + (line.b ? ' bec-speaker-b' : ''), line.speaker);
                var tx = BEC.el('span', 'bec-script-text');
                if (line.html) tx.innerHTML = line.html; else tx.textContent = line.text;
                row.appendChild(sp);
                row.appendChild(tx);
                body.appendChild(row);
            });
            pager.innerHTML = '';
            if (pages.length > 1) {
                var prev = BEC.el('button', 'bec-btn bec-btn-ghost', '‹');
                prev.type = 'button';
                prev.disabled = pageIdx === 0;
                prev.addEventListener('click', function () { pageIdx--; renderPage(); });
                var label = BEC.el('span', null, (pageIdx + 1) + ' / ' + pages.length);
                var next = BEC.el('button', 'bec-btn bec-btn-ghost', '›');
                next.type = 'button';
                next.disabled = pageIdx === pages.length - 1;
                next.addEventListener('click', function () { pageIdx++; renderPage(); });
                pager.appendChild(prev);
                pager.appendChild(label);
                pager.appendChild(next);
            }
        }

        function open() {
            pageIdx = 0;
            renderPage();
            overlay.classList.add('is-open');
        }
        function closeFn() { overlay.classList.remove('is-open'); }

        overlay.addEventListener('click', function (e) { if (e.target === overlay) closeFn(); });
        close.addEventListener('click', closeFn);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeFn();
        });

        renderPage();
        return { open: open, close: closeFn, overlay: overlay };
    };

    /* =====================================================================
       Quiz — canonical one-question-at-a-time exercise (PDF p16 family).
       Used by slides 2, 6, 7, 11. Audio optional; questions, options,
       scoring, hints, answer reveal, restart and navigation all included.
       ===================================================================== */
    BEC.Quiz = function (mount, config) {
        var questions = config.questions;
        var hasAudio = !!config.audio;
        var state = null;

        /* ----- static skeleton ----- */
        var pill = BEC.el('div', 'bec-pill');
        var segProg = seg('Progress', '0/' + questions.length);
        var segOk = seg('Correct', '0', 'bec-ok');
        var segBad = seg('Mistakes', '0', 'bec-bad');
        var segTime = seg('Time', '00:00');
        pill.appendChild(segProg.root);
        pill.appendChild(segOk.root);
        pill.appendChild(segBad.root);
        pill.appendChild(segTime.root);

        var card = BEC.el('div', 'bec-card');
        var top = BEC.el('div', 'bec-card-top');
        var topLabel = BEC.el('span', 'bec-card-top-label', 'Choose the correct answer:');
        var qInd = BEC.el('span', 'bec-q-ind', '1 of ' + questions.length);
        var showBtn = BEC.el('button', 'bec-btn bec-btn-ghost', 'Show Answer');
        showBtn.type = 'button';
        top.appendChild(topLabel);
        top.appendChild(qInd);
        top.appendChild(showBtn);

        var audioBar = null;
        var audioHolder = BEC.el('div');
        if (hasAudio) {
            audioBar = new BEC.AudioBar(audioHolder, config.audio);
        }

        var questionEl = BEC.el('p', 'bec-question');
        var optionsEl = BEC.el('div', 'bec-options');
        var feedbackEl = BEC.el('div', 'bec-feedback');
        var hintEl = BEC.el('div', 'bec-hintline');

        /* question + options live in a middle wrapper so they center
           vertically inside the card */
        var mid = BEC.el('div', 'bec-card-mid');
        mid.appendChild(questionEl);
        mid.appendChild(optionsEl);

        var controls = BEC.el('div', 'bec-controls');
        var restartBtn = ctrlBtn('Restart Quiz');
        var hintBtn = ctrlBtn('Hint');
        var prevBtn = ctrlBtn('Previous Question');
        var nextBtn = ctrlBtn('Next Question', 'bec-btn-primary');
        controls.appendChild(restartBtn);
        controls.appendChild(hintBtn);
        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);

        card.appendChild(top);
        if (hasAudio) card.appendChild(audioHolder);
        card.appendChild(mid);
        card.appendChild(feedbackEl);
        card.appendChild(hintEl);

        mount.appendChild(pill);
        mount.appendChild(card);
        mount.appendChild(controls);

        function seg(label, value, valueCls) {
            var root = BEC.el('div', 'bec-seg');
            root.appendChild(BEC.el('span', 'bec-seg-label', label + ':'));
            var v = BEC.el('span', 'bec-seg-value' + (valueCls ? ' ' + valueCls : ''), value);
            root.appendChild(v);
            return { root: root, value: v };
        }
        function ctrlBtn(label, extra) {
            var b = BEC.el('button', 'bec-btn ' + (extra || 'bec-btn-ghost'), label);
            b.type = 'button';
            return b;
        }

        var timer = BEC.Timer(function (t) { segTime.value.textContent = t; });

        /* ----- state helpers ----- */
        function freshState() {
            return {
                idx: 0,
                answers: {},        // qIndex -> chosen option index
                revealed: {},       // qIndex -> true when revealed via Show Answer
                correct: 0,
                mistakes: 0
            };
        }
        function answeredCount() {
            var n = 0;
            questions.forEach(function (_, i) { if (state.answers[i] != null || state.revealed[i]) n++; });
            return n;
        }
        function isLocked(i) { return state.answers[i] != null || state.revealed[i]; }

        /* ----- rendering ----- */
        function renderQuestion() {
            var q = questions[state.idx];
            qInd.textContent = (state.idx + 1) + ' of ' + questions.length;
            questionEl.textContent = q.text;
            hintEl.textContent = '';
            feedbackEl.textContent = '';
            feedbackEl.className = 'bec-feedback';

            optionsEl.innerHTML = '';
            optionsEl.className = 'bec-options' +
                (q.layout === 'tf' ? ' bec-options-tf' : '') +
                (q.layout === 'pills' ? ' bec-options-row' : '');

            var letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            q.options.forEach(function (optText, oi) {
                var btn = BEC.el('button', 'bec-opt');
                btn.type = 'button';
                if (q.layout !== 'tf' && q.layout !== 'pills') {
                    btn.appendChild(BEC.el('span', 'bec-opt-letter', letters[oi]));
                }
                var label = BEC.el('span', null);
                label.style.flex = '1 1 auto';
                label.textContent = optText;
                btn.appendChild(label);
                var mark = BEC.el('span', 'bec-opt-mark');
                btn.appendChild(mark);

                if (isLocked(state.idx)) {
                    btn.classList.add('is-locked');
                    btn.disabled = true;
                    if (state.revealed[state.idx] || state.answers[state.idx] != null) {
                        if (oi === q.answer) {
                            btn.classList.add(state.revealed[state.idx] && state.answers[state.idx] == null ? 'is-reveal' : 'is-correct');
                            mark.textContent = '✓';
                        } else if (state.answers[state.idx] === oi) {
                            btn.classList.add('is-wrong');
                            mark.textContent = '✕';
                        }
                    }
                    btn.addEventListener('click', function (e) { e.preventDefault(); });
                } else {
                    btn.addEventListener('click', function () { choose(oi); });
                }
                optionsEl.appendChild(btn);
            });

            if (state.answers[state.idx] != null) {
                var wasRight = state.answers[state.idx] === q.answer;
                feedbackEl.textContent = wasRight ? 'Correct! Well done.' : 'Not quite — the correct answer is highlighted.';
                feedbackEl.classList.add(wasRight ? 'bec-ok' : 'bec-bad');
            } else if (state.revealed[state.idx]) {
                feedbackEl.textContent = 'Answer revealed.';
                feedbackEl.classList.add('bec-bad');
            }

            prevBtn.disabled = state.idx === 0;
            nextBtn.disabled = state.idx === questions.length - 1;
            showBtn.disabled = isLocked(state.idx);
            hintBtn.disabled = !q.hint;
        }

        function choose(oi) {
            if (isLocked(state.idx)) return;
            var q = questions[state.idx];
            state.answers[state.idx] = oi;
            if (oi === q.answer) {
                state.correct++;
                segOk.value.textContent = state.correct;
            } else {
                state.mistakes++;
                segBad.value.textContent = state.mistakes;
            }
            segProg.value.textContent = answeredCount() + '/' + questions.length;
            renderQuestion();
        }

        /* ----- controls ----- */
        showBtn.addEventListener('click', function () {
            if (isLocked(state.idx)) return;
            state.revealed[state.idx] = true;
            segProg.value.textContent = answeredCount() + '/' + questions.length;
            renderQuestion();
        });
        hintBtn.addEventListener('click', function () {
            var q = questions[state.idx];
            hintEl.textContent = q.hint || '';
        });
        prevBtn.addEventListener('click', function () {
            if (state.idx > 0) { state.idx--; renderQuestion(); }
        });
        nextBtn.addEventListener('click', function () {
            if (state.idx < questions.length - 1) { state.idx++; renderQuestion(); }
        });
        restartBtn.addEventListener('click', restart);

        function restart() {
            state = freshState();
            segProg.value.textContent = '0/' + questions.length;
            segOk.value.textContent = '0';
            segBad.value.textContent = '0';
            timer.reset();
            timer.start();
            if (audioBar) audioBar.reset();
            renderQuestion();
        }

        restart();
        BEC.entrance('.bec-pill, .bec-card, .bec-controls');

        return {
            restart: restart,
            stopAudio: function () { if (audioBar) audioBar.stop(); },
            audioBar: audioBar,
            timer: timer
        };
    };
})();
