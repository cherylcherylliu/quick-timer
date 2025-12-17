state =
  phase: \idle
  timer-id: null
  end-time: null
  remaining-ms: 0
  cycles: 1
  current-cycle: 0
  prepare-ms: 0
  work-ms: 0
  on-complete: null
  last-beep-second: null
  is-running: false

toggle-button = ->
  txt = switch state.phase
  | \idle => '開始'
  | \done => '再來一次'
  | _ => if state.is-running => '暫停' else '繼續'
  $ \#toggle .text txt

read-int = (selector, fallback = 0) ->
  val = parseInt($ selector .val!, 10)
  if isNaN(val) => fallback else val

format-time = (ms) ->
  total = Math.max 0, Math.round(ms / 1000)
  mins = Math.floor(total / 60)
  secs = total % 60
  ("0#mins").slice(-2) + ':' + ("0#secs").slice(-2)

update-phase-text = ->
  label = switch state.phase
  | \prepare => '準備時間'
  | \cycle => "第#{state.current-cycle} 組 / #{state.cycles}"
  | \done => '完成！'
  | _ => '待命'
  $ \#phase .text label
  progress = switch state.phase
  | \cycle => "進行中：#{state.current-cycle}/#{state.cycles}"
  | \prepare => '準備中'
  | \done => '全部完成'
  | _ => '尚未開始'
  $ \#cycle-progress .text progress

draw-timer = ->
  $ \#timer .text format-time state.remaining-ms

update-ui = ->
  update-phase-text!
  draw-timer!
  toggle-button!

clear-interval = ->
  if state.timer-id =>
    clearInterval state.timer-id
    state.timer-id := null

audio-context = null

ensure-audio = ->
  if !audio-context =>
    Ctx = window.AudioContext or window.webkitAudioContext
    audio-context := new Ctx!

play-ding = ->
  ensure-audio!
  now = audio-context.currentTime
  osc = audio-context.createOscillator!
  gain = audio-context.createGain!
  osc.frequency.value = 880
  gain.gain.setValueAtTime 0.28, now
  gain.gain.exponentialRampToValueAtTime 0.0001, now + 0.22
  osc.connect gain
  gain.connect audio-context.destination
  osc.start now
  osc.stop now + 0.25

pause = ->
  clear-interval!
  state.is-running := false
  toggle-button!

start-tick = ->
  state.end-time := (new Date!)getTime! + state.remaining-ms
  state.is-running := true
  toggle-button!
  clear-interval!
  state.timer-id := setInterval (->
    left = state.end-time - (new Date!)getTime!
    if left <= 0
      state.remaining-ms := 0
      draw-timer!
      pause!
      if state.on-complete => state.on-complete!
    else
      state.remaining-ms := left
      draw-timer!
      seconds-left = Math.ceil(state.remaining-ms / 1000)
      if seconds-left <= 3 and seconds-left != state.last-beep-second
        state.last-beep-second := seconds-left
        play-ding!
  ), 100

start-phase = (phase, duration, on-complete) ->
  state.phase := phase
  state.remaining-ms := duration
  state.last-beep-second := null
  state.on-complete := on-complete
  update-ui!
  start-tick!

finish = ->
  state.phase := \done
  state.remaining-ms := 0
  state.current-cycle := state.cycles
  state.is-running := false
  clear-interval!
  update-ui!
  $ \#quote .removeClass \hidden

start-cycle = ->
  state.current-cycle := state.current-cycle + 1
  if state.current-cycle > state.cycles => finish!
  else start-phase \cycle, state.work-ms, -> start-cycle!

start-sequence = ->
  $ \#quote .addClass \hidden
  state.current-cycle := 0
  if state.prepare-ms > 0 => start-phase \prepare, state.prepare-ms, -> start-cycle!
  else start-cycle!

reset-timer = (keep-config = false) ->
  pause!
  if !keep-config => apply-config!
  state.phase := \idle
  state.current-cycle := 0
  state.on-complete := null
  state.last-beep-second := null
  state.remaining-ms := if state.work-ms > 0 => state.work-ms else 0
  update-ui!
  $ \#quote .addClass \hidden

apply-config = ->
  state.cycles := Math.max 1, read-int \#cycles, 1
  state.prepare-ms := (Math.max 0, read-int \#prepare, 0) * 1000
  mins = Math.max 0, read-int \#minutes, 0
  secs = Math.max 0, read-int \#seconds, 0
  total = mins * 60 + secs
  if total <= 0 => total := 1
  state.work-ms := total * 1000

  $ \#timer .text format-time state.work-ms
  $ \#cycle-progress .text '尚未開始'
  $ \#phase .text '待命'

toggle = ->
  if state.phase == \idle or state.phase == \done =>
    apply-config!
    start-sequence!
  else if state.is-running => pause!
  else start-tick!

resetTimer = ->
  reset-timer!

window.onload = ->
  apply-config!
  reset-timer true
