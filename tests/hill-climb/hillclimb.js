/**
 * @preserve
 * 
 * Javascript Hill Climb Algorithm.
 * @author Adam R. Smith http://codi.st/
 * 
 * Licensed under the new BSD License:
 * http://www.opensource.org/licenses/bsd-license.php
 */

var c3d = c3d || {};
c3d.MIN_INT = (1<<31);
c3d.MAX_INT = ((1<<30) - 1) | (1<<30);

/** 
 * 
 * Hill climb algorithm object, steppable.
 * This version is flexible and easy to use for educational purposes.
 * For high performance needs the functions should probably be inlined
 * in a custom class/function, and it should step until complete automatically.
 * Inlining could be done with a JS compiler like Closure.
 * 
 * @constructor
 */
c3d.HillClimb = function(neighborsFunc, valueFunc, start, steepest) {
	this.neighborsFunc = neighborsFunc;
	this.valueFunc = valueFunc;
	this.setNode(start);
	this.steps = 0;
	this.steepest = !!steepest;
};

/** Avoid mistakes by always setting the value to match the node. */
c3d.HillClimb.prototype.setNode = function(node) {
	this.node = node;
	this.value = this.valueFunc(node);
};

/** Run one or more steps toward the solution. */
c3d.HillClimb.prototype.step = function(stepCount) {
	if (!stepCount || stepCount < 0) stepCount = 1<<30;
	var neighborsFunc = this.neighborsFunc, valueFunc = this.valueFunc, steepest = this.steepest;
	var node = this.node, value = this.value, i = 0;
	for (i = 0; i < stepCount; ++i) {
		var nbs = neighborsFunc(node), nbsl = nbs.length;
		var nextVal = value;
		var nextNode = node;
		for (var j = 0; j < nbsl; ++j) {
			var nb = nbs[j];
			var nbVal = valueFunc(nb);
			if (nbVal > nextVal) {
				nextNode = nb;
				nextVal = nbVal;
				if (!steepest && j > 0) break;
			}
		}
		if (nextVal <= valueFunc(node)) break;
		node = nextNode;
		value = nextVal;
	}
	this.steps += i + 1;
	this.setNode(node);
	
	return node;
};

/** Run until solved, local maximum only. Optionally fire callbacks at each step and when finished. */
c3d.HillClimb.prototype.run = function(stepMs, stepCb, doneCb) {
	var lastNode = this.node, lastValue = this.value;
	var stepInt = null;
	var hillclimb = this;
	stepInt = setInterval(function() {
		hillclimb.step(1);
		if (stepCb) stepCb(hillclimb.node, hillclimb.value, hillclimb.steps);
		if (hillclimb.value == lastValue) {
			clearInterval(stepInt);
			if (doneCb) doneCb(hillclimb.node, hillclimb.value, hillclimb.steps);
			return;
		}
		lastNode = hillclimb.node; lastValue = hillclimb.value;
	}, stepMs);
};

/** Try restart several times until a global maximum is found. */
c3d.HillClimb.prototype.runWithRestart = function(stepMs, stepCb, doneCb, localDoneCb, nodeFunc) {
	var bestNode = this.node, bestValue = this.value;
	var hillclimb = this;
	
	var complete = function() {
		hillclimb.setNode(bestNode);
		doneCb(hillclimb.node, hillclimb.value, hillclimb.steps);
	};
	
	var maxFails = 4, fails = 0;
	var attempt = function() {
		hillclimb.setNode(nodeFunc());
		
		hillclimb.run.call(hillclimb, stepMs, stepCb, function() {
			localDoneCb.apply(hillclimb, arguments);
			if (hillclimb.value > bestValue) {
				bestNode = hillclimb.node;
				bestValue = hillclimb.value;
				fails = 0;
			} else {
				++fails;
			}
			if (fails == maxFails) {
				complete();
			} else {
				setTimeout(attempt, 0);
			}
		});
	};
	attempt();
};
