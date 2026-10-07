// TEMP test shots — one per set
export default function shots(A) {
  return [
    { t: 0, set: 'xsection', p: { magma: 1, fill: 0.8, plug: 1, pressure: 0.6, crystals: 0.5, bubbles: 1 }, cam: { orbit: { c: [0, -8, -10], r: [75, 70], az: [20, 25], el: [12, 14] }, fov: 40 } },
    { t: 2, set: 'globe', p: { ll: [5, 100], cables: 1, cloud: 0.5, ringA: 1, ringK: 1.2, dots: ['london', 'batavia'], arcs: [{ id: 'lb', from: 'london', to: 'batavia', start: 0, dur: 1.5 }] }, cam: { pos: [[0, 0, 34], [0, 0, 32]], look: [[0, 0, 0], [0, 0, 0]], fov: 40 } },
    { t: 4, set: 'studio', p: { bg: 'light', items: [{ kind: 'coffee', pos: [-2.2, 0, 0] }, { kind: 'sugar', pos: [0, 0, 0.3] }, { kind: 'spices', pos: [2.2, 0, 0] }] }, cam: { pos: [[0, 2.6, 6.5], [0, 2.4, 6.2]], look: [[0, 0.5, 0], [0, 0.5, 0]], fov: 40 } },
    { t: 6, set: 'coast', p: { mood: 'day', layout: 'anjer', tsunami: { z0: 120, speed: 0.1, H: 40 } }, cam: { pos: [[-60, 6, -120], [-60, 6, -118]], look: [[60, 20, 40], [60, 20, 40]], fov: 50 } },
    { t: 8, set: 'town', p: { style: 'victorian', mood: 'dusk' }, cam: { pos: [[0, 3, 80], [0, 3, 70]], look: [[0, 8, -100], [0, 8, -100]], fov: 45 } },
    { t: 10, set: 'interior', p: { room: 'veranda', people: [{ style: 'officer', at: [-0.9, 1.0], rot: 60, pose: { drink: 0.3 }, prop: 'glass' }, { style: 'merchant', at: [0.9, 1.2], rot: -70 }] }, cam: { pos: [[-2.5, 1.5, 4.0], [-2.3, 1.5, 3.8]], look: [[0, 1.0, 1.4], [0, 1.0, 1.4]], fov: 42 } },
    { t: 12, set: 'machine', cam: { pos: [[6, 5, 9], [5.5, 5, 8.5]], look: [[0, 4, 0], [0, 4, 0]], fov: 45 } },
    { t: 14, set: 'land', p: { mood: 'golden' }, cam: { pos: [[-60, 4, 18], [-58, 4, 18]], look: [[-100, 3, 0], [-100, 3, 0]], fov: 40 } },
    { t: 16, set: 'seafloor', cam: { pos: [[-14, 3, 10], [-12, 3, 10]], look: [[0, 0, 0], [2, 0, 0]], fov: 45 } },
    { t: 18, set: 'magma', p: { crystals: 0.8, bubbles: 1, pressure: 0.4 }, cam: { pos: [[0, 6, 30], [0, 6, 28]], look: [[0, 1, 0], [0, 1, 0]], fov: 45 } },
    { t: 20, card: { main: '100 YEARS BEFORE', sub: 'THE ERUPTION' } },
    { t: 22, set: 'strait', p: { mood: 'day', ships: [{ id: 'b1', type: 'barque', pos: [-2000, 6800], heading: 30, speed: 3 }, { id: 'w', type: 'warship', pos: [-1500, 7200], heading: 10, speed: 4 }] }, cam: { pos: [[-1850, 8, 6900], [-1850, 8, 6890]], look: [[-1950, 12, 6800], [-1950, 12, 6800]], fov: 45 } },
  ];
}
