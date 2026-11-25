// 알람 소리와 화면 알림. 웹이라 앱 화면이 열려 있을 때만 울린다(명세 9.10).
const RING_INTERVAL_MS = 1600;
const BEEP_PITCH_HZ = 880;
const BEEP_GAP_SEC = 0.35;
const BEEP_LENGTH_SEC = 0.3;
const BEEP_VOLUME = 0.25;

let audio: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;

function unlockAudio(): void {
  try {
    audio = audio ?? new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    // shortcut: 소리를 못 켜면 진동·알림만 쓴다, 오디오 미지원 기기를 따로 안내할 때 개선
  }
}

// 브라우저는 사용자가 한 번 누르기 전에는 소리를 막는다. 첫 터치에서 미리 연다.
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
}

function beep(count: number): void {
  if (!audio) return;
  const start = audio.currentTime;
  for (let i = 0; i < count; i++) {
    const at = start + i * BEEP_GAP_SEC;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = BEEP_PITCH_HZ;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(BEEP_VOLUME, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(at);
    osc.stop(at + BEEP_LENGTH_SEC);
  }
}

function vibrate(pattern: number[]): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
}

export function startAlarmSound(): void {
  stopAlarmSound();
  unlockAudio();
  const ring = () => {
    beep(3);
    vibrate([300, 150, 300]);
  };
  ring();
  ringTimer = setInterval(ring, RING_INTERVAL_MS);
}

export function stopAlarmSound(): void {
  if (ringTimer !== null) clearInterval(ringTimer);
  ringTimer = null;
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(0);
}

// 화면이 가려져 있을 때만 시스템 알림을 띄운다. 소리 설정이 꺼져 있으면 beep만 건너뛴다.
export function notify(title: string, body: string, options: { sound?: boolean } = {}): void {
  if (options.sound !== false) beep(2);
  vibrate([200, 100, 200]);
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (document.hidden) new Notification(title, { body, tag: 'righttime' });
}

// 알람 켜기 때 한 번 부른다. 거절해도 화면 알림은 계속 동작한다.
export function requestNotifyPermission(): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}
