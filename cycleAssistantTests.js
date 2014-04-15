//check the behavior over three cycles for nthMax() and Activity()
function testActivity(){
	//scale for each region:
	var Rate = regionScale(window.region) * 1e6,  //pps, scaled for region
		maxima = [],
		halfDecay = [],
		trueMaxima = [],
		trueHalfDecay = [],
		lifetime = 24*3600000;		//ms

	//first three maxima
	maxima[0] = nthMax(1, Rate, window.cycleParameters.beamOn, window.cycleParameters.beamOff, lifetime);
	maxima[1] = nthMax(3, Rate, window.cycleParameters.beamOn, window.cycleParameters.beamOff, lifetime);
	maxima[2] = nthMax(5, Rate, window.cycleParameters.beamOn, window.cycleParameters.beamOff, lifetime);

	//activity half a decay period after maxima
	halfDecay[0] = Activity(1e6, lifetime, window.cycleParameters.beamOn + 0.5*window.cycleParameters.beamOff, window.region);
	halfDecay[1] = Activity(1e6, lifetime, 2*window.cycleParameters.beamOn + 1.5*window.cycleParameters.beamOff, window.region);
	halfDecay[2] = Activity(1e6, lifetime, 3*window.cycleParameters.beamOn + 2.5*window.cycleParameters.beamOff, window.region);

	//first three maxima, by hand:
	trueMaxima[0] = Rate * (1 - Math.exp(-lifetime * window.cycleParameters.beamOn) );
	trueMaxima[1] = trueMaxima[0] * Math.exp(-lifetime * window.cycleParameters.beamOff); //decay down, cycle complete
	trueMaxima[1] = Rate * (1 - Math.exp(-lifetime * window.cycleParameters.beamOn) ) + trueMaxima[1] * Math.exp(-lifetime * window.cycleParameters.beamOn);
	trueMaxima[2] = trueMaxima[1] * Math.exp(-lifetime * window.cycleParameters.beamOff); //decay down, cycle complete
	trueMaxima[2] = Rate * (1 - Math.exp(-lifetime * window.cycleParameters.beamOn) ) + trueMaxima[2] * Math.exp(-lifetime * window.cycleParameters.beamOn);

	//activity half a decay period after maxima, by hand:
	trueHalfDecay[0] = trueMaxima[0] * Math.exp(-lifetime * window.cycleParameters.beamOff/2);
	trueHalfDecay[1] = trueMaxima[1] * Math.exp(-lifetime * window.cycleParameters.beamOff/2);
	trueHalfDecay[2] = trueMaxima[2] * Math.exp(-lifetime * window.cycleParameters.beamOff/2);

	//report
	console.log('First three maxima report correctly?');
	console.log(maxima[0] == trueMaxima[0]);
	console.log(maxima[1] == trueMaxima[1]);
	console.log(maxima[2] == trueMaxima[2]);

	console.log('First three decays calculated correctly?');
	console.log(halfDecay[0] == trueHalfDecay[0]);
	console.log(halfDecay[1] == trueHalfDecay[1]);
	console.log(halfDecay[2] == trueHalfDecay[2]);

}