import test from 'node:test';
import assert from 'node:assert/strict';
import {horizonRollTarget, smoothHorizonRoll} from '../src/camera-motion.js';

test('horizon compensates both directions relative to calibrated neutral', () => {
  const radians = Math.PI / 180;
  assert.ok(Math.abs(horizonRollTarget(22, 0, true) + 10*radians) < 1e-10);
  assert.ok(Math.abs(horizonRollTarget(-22, 0, true) - 10*radians) < 1e-10);
  assert.equal(horizonRollTarget(37, 15, true), horizonRollTarget(22, 0, true));
});

test('small tremors, inactive sensors and invalid samples do not roll the view', () => {
  for (const tilt of [13, 15, 17]) assert.equal(Math.abs(horizonRollTarget(tilt, 15, true)), 0);
  assert.equal(horizonRollTarget(30, 0, false), 0);
  assert.equal(horizonRollTarget(null, 0, true), 0);
  assert.equal(horizonRollTarget(30, null, true), 0);
});

test('compensation is capped at twelve degrees', () => {
  assert.ok(Math.abs(horizonRollTarget(90, 0, true) + 12*Math.PI/180) < 1e-10);
});

test('smoothing is frame-rate independent and returns smoothly to level', () => {
  function simulate(fps) {let roll=0;for(let i=0;i<fps;i++)roll=smoothHorizonRoll(roll,.2,1/fps);return roll;}
  assert.ok(Math.abs(simulate(30)-simulate(120))<1e-10);
  const returned=smoothHorizonRoll(.2,0,1/60);
  assert.ok(returned>0 && returned<.2);
});
