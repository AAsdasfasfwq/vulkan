// Master shot list: every visual is anchored to the spoken words of the
// voice-over (Whisper word timestamps in public/media/krakatoa.json).
import act1 from './shots/act1.js';
import act2 from './shots/act2.js';
import act3 from './shots/act3.js';
import act4 from './shots/act4.js';
import act5 from './shots/act5.js';
import act6 from './shots/act6.js';
import act7 from './shots/act7.js';
import act8 from './shots/act8.js';

export default function shots(A) {
  return [...act1(A), ...act2(A), ...act3(A), ...act4(A), ...act5(A), ...act6(A), ...act7(A), ...act8(A)];
}
