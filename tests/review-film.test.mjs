import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateReview} from '../scripts/review-film.mjs';
test('review evidence cannot claim the film is approved without watch notes, actual stills and lens contrast',()=>{
 const p={version:1,duration:124,watchedAtNormalSpeed:false,playbackNotes:'looks good',frames:[],sections:[]};
 const r=evaluateReview(p);assert.equal(r.pass,false);assert.ok(r.errors.length>=3);
});
test('an inspected short film can submit timestamped critique with evidence',()=>{
 const frames=Array.from({length:6},(_,i)=>({time:i*2.3,scale:i%2?'close':'wide',file:`still${i}.png`,change:`The tracked signal advances toward the next physical boundary at ${i} seconds.`}));
 const r=evaluateReview({version:1,duration:14,watchedAtNormalSpeed:true,playbackNotes:'Inspected the entire clip at playback rate. The final close looks clean but the persistent header is small; revise at 1080p and re-check.',frames,sections:[{action:'The moving signal passes through four visibly different mechanisms.',risk:'The wireframe visual language is not approved as cinematic launch quality.'}]},{exists:()=>true});assert.equal(r.pass,true,r.errors.join('\n'));
});
