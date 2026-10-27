// Selected scenes for the Midnight Museum animation / interaction proof.
// This compresses the descent between roof and gallery; it is not a second Tower.
export const midnightOpening = {
  title: 'The Midnight Museum',
  gates: [
    { id: 'midnight-roof-v1', label: 'Roof access relay', socket: { topic: 'two-step' } },
    { id: 'midnight-gallery-v1', label: 'Gallery alignment', socket: { topic: 'difference' } },
  ],
  films: {
    arrival: [
      { seconds: 7, camera: [30, 23, 34], end: [18, 13, 23], target: [-3, 1, -1], speaker: 'CAMPUS SECURITY', line: 'Math Tower, do you copy? We have lost contact with your lower research levels.', action: 'landing' },
      { seconds: 6, camera: [-11, 4, 10], end: [-10, 3, 8], target: [-6, 1.4, 3], speaker: 'PILOT', line: 'That is our last safe landing. The roof door should get you inside.', action: 'arrival' },
      { seconds: 6, camera: [15, 6, 4], end: [13, 5, 3], target: [7, 2, -7], speaker: 'DISTANT RADIO', line: 'If anyone can hear this… do not let it—', action: 'door' },
    ],
    welcome: [
      { seconds: 6, camera: [14, 10, 18], end: [8, 6, 14], target: [0, 3, -2], speaker: '', line: '', action: 'reveal' },
      { seconds: 6, camera: [-1, 2.5, 6], end: [-1.5, 2.3, 5.5], target: [-4, 1.1, 2], speaker: 'MUSEUM GUIDEBOT', line: 'Welcome to Math Tower. Please proceed to the nearest… nearest safe reality.', action: 'greeting' },
      { seconds: 5, camera: [4, 2.6, 4], end: [3, 2.2, 3], target: [4, .6, -3], speaker: 'MUSEUM GUIDEBOT', line: 'Please do not touch the exhibits.', action: 'skitters' },
    ],
    alignment: [
      { seconds: 4, camera: [6, 5, 8], end: [5, 4, 6], target: [0, 3, -1], speaker: '', line: '', action: 'align' },
      { seconds: 4, camera: [12, 4, -3], end: [11, 3, -4], target: [9, 2, -10], speaker: 'THE EXPLORER', line: 'That room cannot fit inside this building.', action: 'open' },
    ],
    ending: [
      { seconds: 6, camera: [12, 5, 1], end: [7, 4, -3], target: [9, 2, -11], speaker: 'DISTANT RADIO', line: 'If you are above twelve, do not come down. Actually… forget that. Get out.', action: 'ending' },
    ],
  },
};

// One file owns this Tower's story, geometry, transport, encounters and math sockets.
export default {
  id: 'tower-0001', kind: 'tower', engine: 'tower', title: 'The Night Everything Went Wrong',
  location: 'University campus · 22:47', accent: '#83dfc5', width: 1160, floorHeight: 146,
  floors: [...Array.from({ length: 18 }, (_, i) => String(18 - i)), 'B1', 'B2', 'B3'],
  brief: 'Your helicopter is grounded. The museum is dark, and something is moving below. Restore nine security systems, descend to B3, then return to the lobby to escape. Three optional panels hold supplies and clues. Every calculation is safe: the world waits while you think.',
  ending: 'The campus doors release. Through the rain, the Tower flickers: eighteen floors, nineteen, then eighteen again. Something follows you into the night.',
  stairs: [{ x: 900, from: 0, to: 17 }, { x: 1000, from: 3, to: 14 }, { x: 1010, from: 17, to: 20 }],
  escalators: [{ x: 785, from: 3, to: 4 }, { x: 785, from: 4, to: 5 }, { x: 785, from: 8, to: 9 }, { x: 785, from: 9, to: 10 }],
  lifts: [{ id: 'A', x: 430, stops: [0, 1, 2, 3, 4, 5, 6, 7, 8] }, { id: 'B', x: 680, stops: [2, 4, 6, 8, 10, 12, 14, 16, 18], unlock: 'power' }, { id: 'C', x: 540, stops: [10, 14, 17, 19], unlockFlag: 'freight' }],
  gates: [
    { id: 'roof', floor: 0, x: 220, label: 'Roof access', socket: { topic: 'add' }, message: 'The access panel wakes. The elevator bell sounds somewhere below.' },
    { id: 'supplies', floor: 1, x: 280, label: 'Emergency supplies', optional: true, socket: { topic: 'subtract' }, reward: 'heal', message: 'A fresh medical pack. You keep the flashlight on your belt.' },
    { id: 'museum', floor: 3, x: 220, label: 'Museum security', socket: { topic: 'compare' }, message: 'MATHEMATICS IS EVERYWHERE. Something scratches behind the sign.' },
    { id: 'gallery', floor: 5, x: 220, label: 'Children’s gallery exit', socket: { topic: 'add' }, message: 'A recording asks you to find three triangles. Something scratches behind the wall.' },
    { id: 'power', floor: 6, x: 260, label: 'Research lift power', socket: { topic: 'subtract' }, message: 'Research Lift B is online. Its stop list includes three basements.' },
    { id: 'classroom', floor: 7, x: 270, label: 'Hidden classroom', optional: true, socket: { topic: 'missing' }, message: 'A photograph shows eight researchers. One face is hidden by glare.' },
    { id: 'lab', floor: 10, x: 220, label: 'Robotics laboratory', socket: { topic: 'two-step' }, message: '22:44: Elevator registered B4. There is no B4.' },
    { id: 'lights', floor: 12, x: 260, label: 'Emergency lighting', socket: { topic: 'difference' }, message: 'For a moment the room looks larger inside than outside.' },
    { id: 'battery', floor: 14, x: 220, label: 'Emergency battery', optional: true, reward: 'battery', socket: { topic: 'subtract' }, message: 'You recover a spare battery. It will shield your equipment during the basement escape.' },
    { id: 'restart', floor: 16, x: 220, label: 'Research lift restart', socket: { topic: 'missing-start' }, message: 'A heavy shape dents the roof of the lift. The restart holds. Whatever is above you moves away.' },
    { id: 'generator', floor: 18, x: 250, label: 'Basement generator', socket: { topic: 'difference' }, message: 'The apparatus below begins to hum. A recording says: “Mara, we have run it six times.”' },
    { id: 'override', floor: 20, x: 250, label: 'Campus exit override', requires: ['roof', 'museum', 'gallery', 'power', 'lab', 'lights', 'restart', 'generator'], socket: { topic: 'missing' }, reward: 'escape', message: 'CONTAINMENT FAILURE. The lobby doors are unlocked. Return through B2 and B1 to Floor 1. The stairs are always available.' },
  ],
  exit: { floor: 17, x: 1090, label: 'Lobby campus doors' },
  objects: [
    { id: 'brochure', floor: 0, x: 330, title: 'The museum brochure', text: 'MATH TOWER: Museum • Research • Education. Ask Q.E.D., your educational guide, about any exhibit. One line on the screen flickers: DIMENSIONAL CORRESPONDENCE LAB.' },
    { id: 'facilities', floor: 2, x: 310, title: 'Unregistered positions', text: 'Facilities: Research Lift B has been stopping on unregistered positions again. Engineering says the logs are impossible. Do not use it until morning.' },
    { id: 'guidebot', floor: 9, x: 300, title: 'A trapped Guidebot', text: 'The robot is pinned under an exhibit. “Please remain calm,” it repeats. You can safely lift the fallen display.', choices: [{ label: 'Free the Guidebot', flag: 'guidebot-rescued' }, { label: 'Continue exploring' }] },
    { id: 'ladder', floor: 10, x: 1080, title: 'Maintenance ladder', text: 'A maintenance shaft connects Floor 8 directly to Floor 6.', choices: [{ label: 'Descend to Floor 6', destination: 12 }, { label: 'Stay on Floor 8' }] },
    { id: 'dimensions', floor: 12, x: 330, title: 'The room is too large', text: '“The visualization isn’t the problem. The coordinates are. The room is measuring larger inside than outside.” Another voice answers: “That is impossible.” “Yes.”' },
    { id: 'allocation', floor: 14, x: 1080, title: 'Emergency power allocation', text: 'You have 10 power units. Lighting uses 4, the freight lift 6, and ventilation 5. Choose a safe allocation. All routes retain readable emergency lighting; ventilation clears the lower patrols.', choices: [{ label: 'Lighting + freight lift', flag: 'freight', systems: ['lighting', 'freight'], cost: 10 }, { label: 'Lighting + ventilation', flag: 'ventilation', systems: ['lighting', 'ventilation'], cost: 9 }, { label: 'Decide later' }] },
    { id: 'researcher', floor: 15, x: 310, title: 'The last researcher', text: '“You are from upstairs?” The researcher shakes. “We opened something.” You ask what. “We don’t know.” The lobby exit is sealed; its override is in B3.', choices: [{ label: 'Invite the researcher to come with you', flag: 'researcher-rescued' }, { label: 'Leave them waiting for their colleague', flag: 'researcher-waiting' }] },
    { id: 'shaft-note', floor: 18, x: 330, title: 'A note from engineering', text: 'DO NOT USE SHAFT C. SERIOUSLY. Below, in another hand: freight access is safe again after power allocation. B3 connects to B2 by the service stairs.' },
    { id: 'recording', floor: 19, x: 250, title: 'The correspondence model', text: '“Again,” says a voice. “Mara, we have run it six times.” “Then run it seven.” “Vale says the boundary conditions are unstable.” “Vale says everything is unstable.” The screen shows Towers with different numbers of floors.' },
  ],
  enemies: [4, 5, 7, 9, 11, 13, 15, 17, 19].map((floor, i) => ({ floor, x: 540, kind: i % 3 === 0 ? 'guidebot' : 'skitter', speed: 45 + i * 3 })),
  notes: { 0: '← → / A D move · E interact · Space jump · X stun. Find the glowing roof panel.', 1: 'A broken Guidebot whispers: “Please proceed to the nearest… nearest safe reality.”', 2: 'The lift display flashes “19”. There should only be eighteen floors.', 4: 'Skitters fear the pulse tool. Jump, stun them with X, or pass during recovery.', 6: '“If you are above twelve, do not come down.” Static. “Actually… forget that. Get out.”', 8: 'Public Lift A ends here. Research Lift B and the marked stairs continue downward.', 13: 'A tall silhouette waits behind the glass. A flash of lightning. It is gone.', 15: 'A whiteboard reads: TEST DELAYED. NO. CANCEL IT. TOO LATE.', 17: 'Freedom is visible through the glass. The lobby doors require the override in B3.', 20: 'Inside the apparatus: another Tower, upside down. Something moves inside it.' },
};
