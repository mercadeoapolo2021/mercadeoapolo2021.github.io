// ====== Colores ======
    const COLORS = [
      { name: "AZUL", value: "#2563EB", say: "azul" },
      { name: "ROJO", value: "#DC2626", say: "rojo" },
      { name: "AMARILLO", value: "#F59E0B", say: "amarillo" },
      { name: "VERDE", value: "#16A34A", say: "verde" }
    ];

    const label = document.getElementById('label');
    const startBtn = document.getElementById('startBtn');
    const stage = document.getElementById('stage');
    const app = document.getElementById('app');
    const musicToggle = document.getElementById('musicToggle');
    const voiceToggle = document.getElementById('voiceToggle');
    const volRange = document.getElementById('volRange');

    let isSpinning = false;
    let spinTimer = null;

    function setStageColor(c) {
      document.body.style.backgroundColor = c.value;
      app.style.backgroundColor = c.value;
      stage.style.backgroundColor = c.value;
      label.textContent = c.name;
      const contrast = getContrastYIQ(c.value);
      label.style.color = contrast;
    }

    function getContrastYIQ(hexcolor) {
      const h = hexcolor.replace('#', '');
      const r = parseInt(h.substring(0,2), 16);
      const g = parseInt(h.substring(2,4), 16);
      const b = parseInt(h.substring(4,6), 16);
      const yiq = ((r*299)+(g*587)+(b*114))/1000;
      return (yiq >= 150) ? '#111827' : '#FFFFFF';
    }

    function randomColor() {
      const i = Math.floor(Math.random() * COLORS.length);
      return COLORS[i];
    }

    // ====== Música infantil (generada por Web Audio, libre de derechos) ======
    let AudioCtx = window.AudioContext || window.webkitAudioContext;
    let ctx = null;
    let master = null;
    let musicGain = null;
    let isMusicPlaying = false;
    let musicTimer = null;
    const BPM = 116;
    const beatMs = 60000 / BPM;

    const scaleHz = {
      C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
      C6: 1046.50, E6: 1318.51, G6: 1567.98
    };
    const pattern = [
      'C5','D5','E5','G5','A5','G5','E5','D5',
      'C5','E5','G5','E5','D5','C5','C5'
    ];

    function ensureAudio() {
      if (!ctx) {
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);

        musicGain = ctx.createGain();
        musicGain.gain.value = parseFloat(volRange.value);
        musicGain.connect(master);
      }
      if (ctx.state === 'suspended') ctx.resume();
    }

    function setVolume(v) {
      if (musicGain) {
        musicGain.gain.setTargetAtTime(v, ctx.currentTime, 0.01);
      }
    }

    function playNote(freq, durMs) {
      if (!ctx || !musicGain) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const real = new Float32Array([0, 1, 0.25, 0.12]);
      const imag = new Float32Array(real.length);
      const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: true });
      osc.setPeriodicWave(wave);
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(1.0, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + (durMs/1000) * 0.85);

      osc.connect(gain);
      gain.connect(musicGain);

      osc.start(t0);
      osc.stop(t0 + durMs/1000);
    }

    function loopMelody() {
      if (!isMusicPlaying) return;
      let i = 0;
      const step = () => {
        if (!isMusicPlaying) return;
        const note = pattern[i % pattern.length];
        const freq = scaleHz[note] || 523.25;
        playNote(freq, beatMs * 0.9);
        i++;
        musicTimer = setTimeout(step, beatMs);
      };
      step();
    }

    function startMusic() {
      if (!musicToggle.checked) return;
      ensureAudio();
      if (isMusicPlaying) return;
      isMusicPlaying = true;
      fadeTo(volRange.value, 0.4);
      loopMelody();
    }

    function stopMusic() {
      if (!ctx || !isMusicPlaying) return;
      isMusicPlaying = false;
      if (musicTimer) clearTimeout(musicTimer);
      fadeTo(0.0, 0.35);
    }

    function fadeTo(target, seconds) {
      if (!musicGain) return;
      const now = ctx.currentTime;
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setTargetAtTime(target, now, seconds);
    }

    volRange.addEventListener('input', () => {
      if (!ctx) return;
      setVolume(parseFloat(volRange.value));
    });

    // ====== Voz infantil (Web Speech API) ======
    let voices = [];
    function loadVoices() { voices = speechSynthesis.getVoices(); }
    loadVoices();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
    function speakSpanish(text) {
      if (!voiceToggle.checked) return;
      if (typeof speechSynthesis === 'undefined') return;
      const utter = new SpeechSynthesisUtterance(text);
      const preferred = voices.find(v => /es(-|_)?(ES|MX|US|419)?/i.test(v.lang)) || voices.find(v => v.lang.startsWith('es'));
      if (preferred) utter.voice = preferred;
      utter.lang = preferred ? preferred.lang : 'es-ES';
      utter.pitch = 1.6;
      utter.rate = 0.95;
      utter.volume = 1.0;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    }

    // ====== Ruleta ======
    async function spin() {
      if (isSpinning) return;
      isSpinning = true;
      startBtn.disabled = true;

      // Arrancar música
      startMusic();

      // Fase 1: rápido
      await rapidShuffle(90, 1400);

      // Fase 2: desaceleración
      const steps = [140, 200, 260, 340, 460, 620, 820];
      for (const delay of steps) {
        await wait(delay);
        setStageColor(randomColor());
      }

      // Color final
      const final = randomColor();
      await wait(800);
      setStageColor(final);

      // Efecto visual
      label.animate(
        [{ transform: 'scale(1.0)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1.0)' }],
        { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );

      // Parar música con fundido y decir color
      stopMusic();
      speakSpanish(final.say);

      isSpinning = false;
      startBtn.disabled = false;
    }

    function rapidShuffle(intervalMs, durationMs) {
      return new Promise((resolve) => {
        let t = 0;
        spinTimer = setInterval(() => {
          setStageColor(randomColor());
          t += intervalMs;
          if (t >= durationMs) {
            clearInterval(spinTimer);
            resolve();
          }
        }, intervalMs);
      });
    }

    function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

    // Interacciones
    startBtn.addEventListener('click', () => { ensureAudio(); spin(); });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        ensureAudio();
        spin();
      }
    });
    musicToggle.addEventListener('change', () => {
      if (!musicToggle.checked) stopMusic();
    });

    // Estado inicial (sin texto/elemento de sugerencia)
    setStageColor({ name: "LISTO", value: "#0EA5E9" });