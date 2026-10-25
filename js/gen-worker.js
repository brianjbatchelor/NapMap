/* NapMap generator worker: runs puzzle generation off the main thread.
   Request:  {id, n, seed, target?}   target {min, max, minSteps} picks a rated puzzle via NapMapDifficulty.generateRated
   Response: {id, ok:true, puzzle:{n, sol, reg, colors, rating?, tries?}, ms}  or  {id, ok:false, error}
   Usage from the page:
     const w = new Worker('js/gen-worker.js');
     w.onmessage = e => { if (e.data.ok) use(e.data.puzzle) };
     w.postMessage({id: 1, n: 10, seed: 12345, target: {min: 4, max: 4}}); */
importScripts('generator.js', 'difficulty.js');
self.onmessage = e => {
  const {id, n, seed, target} = e.data || {};
  try {
    const t0 = Date.now();
    const puzzle = target ? self.NapMapDifficulty.generateRated(n, seed, target) : self.SunGen.generate(n, seed);
    self.postMessage({id, ok: true, puzzle, ms: Date.now() - t0});
  } catch (err) {
    self.postMessage({id, ok: false, error: String(err && err.message || err)});
  }
};
