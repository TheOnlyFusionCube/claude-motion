# Build: beat sheet

An 11 s tabletop film in CSS 3D. A warm dark room, a white desk of real UI plates, one orange character.

| t | subject | action | framing | words on screen | carries into next by | sound |
|---|---|---|---|---|---|---|
| 0–1.25 | a drawing of the character on a design canvas (selection box, "120 × 84") | it pops up from the flat drawing into a 3D box with legs and eyes | top-down on the canvas | (UI only) | the camera drops low as it hops | pop, boing, pad |
| 1.25–5.4 | the character | hops, turns and walks across the desk past the toolbar, legs swinging from the distance walked | drops to low and close, then follows; plates blur with distance | — | it reaches the Build button | groove; a tick per footfall |
| 5.4–7 | the Build button | it jumps on it; the button sinks; a blue line runs to the phone lying on the desk; the phone lights up | pulls up to see button, line and phone | MADE WITH KIT (on the phone) | the phone stands up | whoosh, click + kick, roll, chime |
| 7–11 | the phone and the character | the phone hinges up to stand; the character walks to its side, turns to camera and hops | front-on, low, slow creep | — (end) | — | swell, kick + chord, glock run |

Techniques: `kit.space` (desk, plates, camera keys + follow blend), `kit.box3d` + `kit.gait` (character),
`kit.focus` (depth of field by `sp.depth`), hinge maths for the standing phone, `phone()` from `ui/devices.js`.
