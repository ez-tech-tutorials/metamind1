(() => {
  const toast = document.getElementById("note-toast");
  const nowPlaying = document.getElementById("now-playing");
  const overlay = document.getElementById("start-overlay");
  const enterBtn = document.getElementById("enter-btn");
  const strumBtn = document.getElementById("strum-btn");
  const hint = document.getElementById("control-hint");

  const SCALE = 0.58;
  const NUT_X = -0.4;
  const BRIDGE_X = NUT_X + SCALE;
  const STRING_Z = [-0.024, -0.0145, -0.005, 0.005, 0.0145, 0.024];
  const BOARD_Y = 0.018;
  const STRING_Y = 0.026;
  const SKIN = "#d9a078";
  const SKIN_DEEP = "#c48662";
  const NAIL = "#f3d4c0";

  const CHORDS = [
    {
      id: "G",
      color: "#e4b45a",
      strings: [3, 2, 0, 0, 3, 3],
      fingers: [
        { finger: 2, string: 0, fret: 3 },
        { finger: 1, string: 1, fret: 2 },
        { finger: 3, string: 4, fret: 3 },
        { finger: 4, string: 5, fret: 3 },
      ],
    },
    {
      id: "C",
      color: "#7ec8e3",
      strings: [-1, 3, 2, 0, 1, 0],
      fingers: [
        { finger: 3, string: 1, fret: 3 },
        { finger: 2, string: 2, fret: 2 },
        { finger: 1, string: 4, fret: 1 },
      ],
    },
    {
      id: "D",
      color: "#e07a5f",
      strings: [-1, -1, 0, 2, 3, 2],
      fingers: [
        { finger: 1, string: 3, fret: 2 },
        { finger: 3, string: 4, fret: 3 },
        { finger: 2, string: 5, fret: 2 },
      ],
    },
    {
      id: "Em",
      color: "#81b29a",
      strings: [0, 2, 2, 0, 0, 0],
      fingers: [
        { finger: 2, string: 1, fret: 2 },
        { finger: 3, string: 2, fret: 2 },
      ],
    },
    {
      id: "Am",
      color: "#c9a0dc",
      strings: [-1, 0, 2, 2, 1, 0],
      fingers: [
        { finger: 2, string: 2, fret: 2 },
        { finger: 3, string: 3, fret: 2 },
        { finger: 1, string: 4, fret: 1 },
      ],
    },
    {
      id: "E",
      color: "#f2cc8f",
      strings: [0, 2, 2, 1, 0, 0],
      fingers: [
        { finger: 2, string: 1, fret: 2 },
        { finger: 3, string: 2, fret: 2 },
        { finger: 1, string: 3, fret: 1 },
      ],
    },
  ];

  let selected = CHORDS[0];

  function fretX(n) {
    if (n <= 0) return NUT_X;
    return NUT_X + SCALE * (1 - 2 ** (-n / 12));
  }

  function pressX(fret) {
    return (fretX(fret - 1) + fretX(fret)) / 2;
  }

  function degToRad(value) {
    return (THREE.MathUtils || THREE.Math).degToRad(value);
  }

  function prim(tag, attrs = {}) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function announce(label) {
    nowPlaying.textContent = label;
    toast.textContent = label;
    toast.classList.add("show");
    clearTimeout(announce._t);
    announce._t = setTimeout(() => toast.classList.remove("show"), 800);
  }

  function fingerMesh(className, x) {
    const group = prim("a-entity", { class: className, position: `${x} 0.01 -0.055` });
    group.appendChild(
      prim("a-box", {
        class: "seg-1",
        position: "0 0.03 0",
        width: "0.015",
        height: "0.055",
        depth: "0.015",
        color: SKIN,
      })
    );
    group.appendChild(
      prim("a-box", {
        class: "seg-2",
        position: "0 0.068 0.006",
        width: "0.013",
        height: "0.038",
        depth: "0.013",
        color: SKIN_DEEP,
        rotation: "18 0 0",
      })
    );
    group.appendChild(
      prim("a-box", {
        class: "nail",
        position: "0 0.09 0.012",
        width: "0.011",
        height: "0.01",
        depth: "0.004",
        color: NAIL,
      })
    );
    return group;
  }

  function createHand(kind) {
    const root = prim("a-entity", { class: `performer-hand ${kind}-hand` });
    const rig = prim("a-entity", { class: "hand-rig" });
    const mesh = prim("a-entity", { class: "hand-mesh" });
    mesh.appendChild(prim("a-box", { class: "palm", width: "0.088", height: "0.026", depth: "0.1", color: SKIN }));
    mesh.appendChild(
      prim("a-cylinder", {
        class: "wrist",
        radius: "0.02",
        height: "0.07",
        color: SKIN_DEEP,
        position: "0 -0.006 0.075",
        rotation: "62 0 0",
      })
    );
    const thumb = prim("a-entity", { class: "thumb", position: "-0.05 0.008 0.018", rotation: "8 0 42" });
    thumb.appendChild(prim("a-box", { width: "0.016", height: "0.048", depth: "0.018", color: SKIN, position: "0 0.028 0" }));
    mesh.appendChild(thumb);
    mesh.appendChild(fingerMesh("finger f1", -0.028));
    mesh.appendChild(fingerMesh("finger f2", -0.01));
    mesh.appendChild(fingerMesh("finger f3", 0.01));
    mesh.appendChild(fingerMesh("finger f4", 0.028));
    rig.appendChild(mesh);
    root.appendChild(rig);
    return root;
  }

  function buildGuitar(root) {
    const bodyX = BRIDGE_X + 0.02;
    root.appendChild(prim("a-sphere", { position: `${bodyX + 0.02} -0.02 0`, radius: "0.2", scale: "1.15 0.22 1.05", color: "#8a4a1e" }));
    root.appendChild(prim("a-sphere", { position: `${bodyX + 0.16} -0.03 0`, radius: "0.24", scale: "1.2 0.22 1.12", color: "#7a4018" }));
    root.appendChild(prim("a-circle", { position: `${bodyX + 0.05} ${BOARD_Y + 0.012} 0`, rotation: "-90 0 0", radius: "0.055", color: "#140e0a" }));
    root.appendChild(prim("a-ring", { position: `${bodyX + 0.05} ${BOARD_Y + 0.013} 0`, rotation: "-90 0 0", "radius-inner": "0.055", "radius-outer": "0.07", color: "#c9a227" }));
    root.appendChild(
      prim("a-box", {
        class: "clickable strum-pad",
        position: `${bodyX + 0.08} ${STRING_Y + 0.02} 0`,
        width: "0.22",
        height: "0.05",
        depth: "0.12",
        material: "opacity: 0.08; transparent: true; color: #f0c36e",
      })
    );
    root.appendChild(
      prim("a-text", {
        value: "STRUM",
        position: `${bodyX + 0.08} ${STRING_Y + 0.06} 0.08`,
        align: "center",
        width: "1.4",
        color: "#e4b45a",
      })
    );
    root.appendChild(prim("a-box", { position: `${BRIDGE_X} ${BOARD_Y + 0.004} 0`, width: "0.018", height: "0.012", depth: "0.07", color: "#3b2416" }));

    const neckLen = SCALE + 0.04;
    root.appendChild(
      prim("a-box", {
        position: `${NUT_X + neckLen / 2 - 0.02} ${BOARD_Y - 0.012} 0`,
        width: `${neckLen}`,
        height: "0.022",
        depth: "0.058",
        color: "#c48a48",
      })
    );
    root.appendChild(
      prim("a-box", {
        position: `${NUT_X + SCALE / 2} ${BOARD_Y} 0`,
        width: `${SCALE}`,
        height: "0.01",
        depth: "0.054",
        color: "#3a2216",
      })
    );
    root.appendChild(prim("a-box", { position: `${NUT_X} ${BOARD_Y + 0.006} 0`, width: "0.008", height: "0.014", depth: "0.056", color: "#efe6d6" }));

    const headX = NUT_X - 0.07;
    root.appendChild(prim("a-box", { position: `${headX} ${BOARD_Y} 0`, width: "0.11", height: "0.016", depth: "0.07", color: "#6b3b16" }));
    for (let i = 0; i < 6; i += 1) {
      const side = i < 3 ? -0.042 : 0.042;
      const along = -0.03 + (i % 3) * 0.028;
      root.appendChild(
        prim("a-cylinder", {
          position: `${headX + along} ${BOARD_Y + 0.012} ${side}`,
          radius: "0.006",
          height: "0.02",
          color: "#cfc6b4",
        })
      );
    }

    for (let n = 1; n <= 12; n += 1) {
      root.appendChild(
        prim("a-box", {
          position: `${fretX(n)} ${BOARD_Y + 0.006} 0`,
          width: "0.004",
          height: "0.008",
          depth: "0.054",
          color: "#d8d2c6",
        })
      );
    }
    [3, 5, 7, 9].forEach((n) => {
      root.appendChild(
        prim("a-cylinder", {
          position: `${pressX(n)} ${BOARD_Y + 0.006} 0`,
          radius: "0.005",
          height: "0.003",
          color: "#efe6d6",
          rotation: "0 0 0",
        })
      );
    });
    root.appendChild(prim("a-cylinder", { position: `${pressX(12)} ${BOARD_Y + 0.006} -0.01`, radius: "0.0045", height: "0.003", color: "#efe6d6" }));
    root.appendChild(prim("a-cylinder", { position: `${pressX(12)} ${BOARD_Y + 0.006} 0.01`, radius: "0.0045", height: "0.003", color: "#efe6d6" }));

    STRING_Z.forEach((z, i) => {
      const thick = 0.0022 - i * 0.00022;
      root.appendChild(
        prim("a-box", {
          class: `string string-${i}`,
          position: `${NUT_X + SCALE / 2} ${STRING_Y} ${z}`,
          width: `${SCALE}`,
          height: `${thick}`,
          depth: `${thick}`,
          color: i < 3 ? "#b7b1a6" : "#ece7dc",
        })
      );
    });

    const dots = prim("a-entity", { id: "finger-dots" });
    root.appendChild(dots);

    CHORDS.forEach((chord, index) => {
      const x = pressX(index + 1);
      const marker = prim("a-entity", {
        class: "clickable chord-marker",
        position: `${x} ${BOARD_Y + 0.02} 0.042`,
        "chord-pad": `chord: ${chord.id}`,
      });
      marker.appendChild(
        prim("a-cylinder", {
          class: "chord-disc",
          radius: "0.016",
          height: "0.008",
          color: chord.color,
        })
      );
      marker.appendChild(
        prim("a-text", {
          value: chord.id,
          position: "0 0.02 0",
          align: "center",
          width: "0.7",
          color: "#fff6e8",
        })
      );
      root.appendChild(marker);
    });

    const left = createHand("left");
    left.setAttribute("id", "left-player-hand");
    left.setAttribute("scale", "1.05 1.05 1.05");
    root.appendChild(left);

    const right = createHand("right");
    right.setAttribute("id", "right-player-hand");
    right.setAttribute("scale", "1.08 1.08 1.08");
    right.setAttribute("position", `${BRIDGE_X + 0.05} ${STRING_Y + 0.08} 0.02`);
    right.setAttribute("rotation", "-20 90 90");
    root.appendChild(right);
  }

  AFRAME.registerComponent("chord-pad", {
    schema: { chord: { type: "string" } },
    init() {
      this.el.addEventListener("click", () => selectChord(this.data.chord));
      this.el.addEventListener("triggerdown", () => selectChord(this.data.chord));
    },
  });

  AFRAME.registerComponent("left-chord-hand", {
    init() {
      this.fingers = [1, 2, 3, 4].map((n) => this.el.querySelector(`.f${n}`));
      this.rig = this.el.querySelector(".hand-rig");
    },
    tick() {
      const used = selected.fingers;
      const xs = used.map((f) => pressX(f.fret));
      const zs = used.map((f) => STRING_Z[f.string]);
      const midX = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : pressX(2);
      const midZ = zs.length ? zs.reduce((a, b) => a + b, 0) / zs.length : 0;
      this.el.object3D.position.lerp(new THREE.Vector3(midX, STRING_Y + 0.04, midZ), 0.18);
      this.el.object3D.rotation.set(degToRad(-12), degToRad(180), degToRad(8));

      this.fingers.forEach((fingerEl, i) => {
        const fingerNum = i + 1;
        const press = used.find((f) => f.finger === fingerNum);
        if (!fingerEl) return;
        if (press) {
          const local = new THREE.Vector3(
            -(pressX(press.fret) - midX),
            -0.01,
            -(STRING_Z[press.string] - midZ)
          );
          fingerEl.object3D.position.lerp(local, 0.2);
          fingerEl.object3D.rotation.x = degToRad(48);
        } else {
          fingerEl.object3D.position.lerp(new THREE.Vector3(0.028 - i * 0.018, 0.018, 0.035), 0.2);
          fingerEl.object3D.rotation.x = degToRad(16);
        }
      });
    },
  });

  AFRAME.registerComponent("right-strum-hand", {
    init() {
      this.mode = "idle";
      this.t = 0;
      this.rest = this.el.object3D.position.clone();
    },
    strum() {
      this.mode = "strum";
      this.t = 0;
    },
    tick(_, delta) {
      const dt = Math.min(delta, 40) / 1000;
      const rest = new THREE.Vector3(BRIDGE_X + 0.05, STRING_Y + 0.07, 0.03);
      if (this.mode === "strum") {
        this.t += dt;
        const k = Math.min(this.t / 0.22, 1);
        const swing = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55;
        this.el.object3D.position.set(rest.x - 0.01, rest.y - 0.025 * swing, 0.05 - 0.1 * swing);
        this.el.object3D.rotation.set(degToRad(-10 - 25 * swing), degToRad(90), degToRad(90));
        if (k >= 1) this.mode = "idle";
      } else {
        this.el.object3D.position.lerp(rest, 0.12);
      }
    },
  });

  function paintDots() {
    const host = document.getElementById("finger-dots");
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    selected.fingers.forEach((press) => {
      host.appendChild(
        prim("a-sphere", {
          position: `${pressX(press.fret)} ${BOARD_Y + 0.01} ${STRING_Z[press.string]}`,
          radius: "0.0065",
          color: selected.color,
        })
      );
    });
    document.querySelectorAll(".chord-disc").forEach((disc, i) => {
      const on = CHORDS[i].id === selected.id;
      disc.setAttribute("color", on ? "#fff4c8" : CHORDS[i].color);
      disc.parentElement.setAttribute("scale", on ? "1.25 1.25 1.25" : "1 1 1");
    });
  }

  function selectChord(id) {
    const next = CHORDS.find((c) => c.id === id);
    if (!next) return;
    selected = next;
    announce(`${selected.id} chord`);
    if (hint) hint.textContent = `${selected.id} ready · press strum / right trigger`;
    paintDots();
  }

  function strumNow() {
    SoundStudio.resume();
    SoundStudio.strum(selected.strings);
    announce(`Strum · ${selected.id}`);
    
    // Trigger right controller haptic feedback
    const rightHand = document.getElementById("right-hand");
    if (rightHand) {
      const keybindsComp = document.querySelector("a-scene")?.components?.["quest-keybinds"];
      if (keybindsComp) {
        keybindsComp.triggerHaptic(rightHand, 0.7, 100);
      }
    }
    
    const right = document.getElementById("right-player-hand");
    right?.components["right-strum-hand"]?.strum();
    document.querySelectorAll(".string").forEach((el, i) => {
      if (selected.strings[i] < 0) return;
      const color = el.getAttribute("color");
      el.setAttribute("color", "#fff4c8");
      setTimeout(() => el.setAttribute("color", color), 90);
    });
  }

  AFRAME.registerComponent("quest-keybinds", {
    init() {
      this.pads = { left: { stick: null, buttons: {} }, right: { stick: null, buttons: {} } };
      this.lockUntil = 0;
      this.cursor = document.getElementById("desktop-cursor");
      this.el.addEventListener("enter-vr", () => {
        SoundStudio.resume();
        overlay.hidden = true;
        const player = document.getElementById("player");
        if (player) player.setAttribute("position", "0 0 0");
        if (this.cursor) this.cursor.setAttribute("visible", false);
      });
      this.el.addEventListener("exit-vr", () => {
        if (this.cursor) this.cursor.setAttribute("visible", true);
      });
      this.bindHands();
    },
    triggerHaptic(handEl, intensity = 0.5, duration = 80) {
      if (!handEl) return;
      const controller = handEl.components?.["tracked-controls"]?.controller || 
                         handEl.components?.["tracked-controls-webxr"]?.controller;
      const gamepad = controller?.gamepad;
      if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
        gamepad.hapticActuators[0].pulse(intensity, duration).catch(() => {});
      }
    },
    bindHands() {
      const left = document.getElementById("left-hand");
      const right = document.getElementById("right-hand");
      const fire = (fn) => () => {
        if (performance.now() < this.lockUntil) return;
        this.lockUntil = performance.now() + 120;
        fn();
      };
      
      const onIntersect = (event) => {
        const handEl = event.currentTarget;
        const target = event.detail.els[0];
        if (target && (target.classList.contains("chord-marker") || target.classList.contains("strum-pad") || target.classList.contains("string"))) {
          this.triggerHaptic(handEl, 0.25, 30);
        }
      };

      if (left) {
        left.addEventListener("xbuttondown", fire(() => {
          cycleChord(-1);
          this.triggerHaptic(left, 0.4, 60);
        }));
        left.addEventListener("ybuttondown", fire(() => {
          cycleChord(1);
          this.triggerHaptic(left, 0.4, 60);
        }));
        left.addEventListener("gripdown", fire(() => {
          SoundStudio.muteAll();
          announce("Palm Mute");
          this.triggerHaptic(left, 0.5, 80);
        }));
        left.addEventListener("thumbstickmoved", (event) => this.onStick("left", event.detail.x));
        left.addEventListener("raycaster-intersection", onIntersect);
      }
      if (right) {
        right.addEventListener("triggerdown", () => {
          if (this.isAimingChord(right)) return;
          fire(() => strumNow())();
        });
        right.addEventListener("abuttondown", fire(() => strumNow()));
        right.addEventListener("bbuttondown", fire(() => {
          cycleChord(1);
          this.triggerHaptic(right, 0.4, 60);
        }));
        right.addEventListener("gripdown", fire(() => {
          SoundStudio.muteAll();
          announce("Palm Mute");
          this.triggerHaptic(right, 0.5, 80);
        }));
        right.addEventListener("thumbstickmoved", (event) => {
          const y = event.detail.y;
          const state = this.pads.right;
          if (y > 0.68 && state.stickY !== "d") {
            state.stickY = "d";
            fire(() => strumNow())();
          } else if (y < -0.68 && state.stickY !== "u") {
            state.stickY = "u";
            fire(() => strumNow())();
          } else if (Math.abs(y) < 0.3) state.stickY = null;
        });
        right.addEventListener("raycaster-intersection", onIntersect);
      }
    },
    isAimingChord(handEl) {
      if (!handEl?.components?.raycaster) return false;
      const hit = handEl.components.raycaster.intersections?.[0];
      const el = hit?.object?.el;
      if (!el) return false;
      return Boolean(el.classList?.contains("chord-marker") || el.closest?.(".chord-marker"));
    },
    onStick(hand, x) {
      const state = this.pads[hand];
      if (x > 0.68 && state.stick !== "r") {
        state.stick = "r";
        cycleChord(1);
        const handEl = document.getElementById(`${hand}-hand`);
        this.triggerHaptic(handEl, 0.4, 60);
      } else if (x < -0.68 && state.stick !== "l") {
        state.stick = "l";
        cycleChord(-1);
        const handEl = document.getElementById(`${hand}-hand`);
        this.triggerHaptic(handEl, 0.4, 60);
      } else if (Math.abs(x) < 0.3) state.stick = null;
    },
    tick() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const rightHand = document.getElementById("right-hand");
      for (const pad of pads) {
        if (!pad || pad.hand !== "right") continue;
        const down = Boolean(pad.buttons[0]?.pressed);
        const was = this.pads.right.buttons[0];
        this.pads.right.buttons[0] = down;
        if (down && !was && performance.now() >= this.lockUntil && !this.isAimingChord(rightHand)) {
          this.lockUntil = performance.now() + 120;
          strumNow();
        }
      }
    },
  });

  function cycleChord(dir) {
    const i = CHORDS.findIndex((c) => c.id === selected.id);
    selectChord(CHORDS[(i + dir + CHORDS.length) % CHORDS.length].id);
  }

  AFRAME.registerComponent("hover-glow", {
    schema: {
      rest: { type: "color", default: "#fff" },
      glow: { type: "color", default: "#ff0" },
    },
    init() {
      this.el.addEventListener("mouseenter", () => {
        this.el.setAttribute("color", this.data.glow);
      });
      this.el.addEventListener("mouseleave", () => {
        this.el.setAttribute("color", this.data.rest);
      });
    },
  });

  function bindUi() {
    if (enterBtn) {
      enterBtn.addEventListener("click", async () => {
        await SoundStudio.resume();
        overlay.hidden = true;
        const player = document.getElementById("player");
        if (player) {
          player.setAttribute("position", "0 0 0");
          player.setAttribute("rotation", "0 0 0");
        }
      });
    }

    if (strumBtn) {
      strumBtn.addEventListener("click", async () => {
        await SoundStudio.resume();
        overlay.hidden = true;
        strumNow();
      });
    }

    const demoBtn = document.getElementById("demo-btn");
    if (demoBtn) {
      demoBtn.addEventListener("click", () => {
        SoundStudio.resume();
        announce("Playing Demo Jam...");
        
        const chords = ["G", "C", "D", "Em"];
        chords.forEach((chord, i) => {
          setTimeout(() => {
            selectChord(chord);
            strumNow();
          }, i * 1500);
        });
      });
    }

    const activeKeys = new Set();

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (activeKeys.has(key)) return;
      activeKeys.add(key);

      // Guitar Chords
      const map = { 1: "G", 2: "C", 3: "D", 4: "Em", 5: "Am", 6: "E" };
      if (map[event.key]) selectChord(map[event.key]);
      if (event.key === " ") {
        event.preventDefault();
        strumNow();
      }
    });

    window.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      activeKeys.delete(key);
    });
  }

  const scene = document.querySelector("a-scene");
  const start = () => {
    const root = document.getElementById("guitar-root");
    buildGuitar(root);
    document.getElementById("left-player-hand").setAttribute("left-chord-hand", "");
    document.getElementById("right-player-hand").setAttribute("right-strum-hand", "");
    root.querySelector(".strum-pad").addEventListener("click", strumNow);
    bindUi();
    selectChord("G");
  };
  if (scene.hasLoaded) start();
  else scene.addEventListener("loaded", start);
})();
