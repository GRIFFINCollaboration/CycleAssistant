//sanity checks for the behaviour of the activity(t0, A0, rate, lifetime, t) function
function testActivity(){
	//scale for each region:
	var scaleConstant;
	if(window.region == 'tape') scaleConstant = 0.89;
	else if(window.region == 'chamber') scaleConstant = 0.01;
	else if(window.region == 'beamline') scaleConstant = 0.1;


	//activity at end of duration should come out the same whether iterated from t=0 or in two steps:
	if (verbose) console.log('Activity for entire duration:')
	var finalA = activity(0, 0, 1e9, Math.log(2)/36000, window.cycleParameters.duration*3600000 ) 
	if (verbose) console.log(finalA);
	if (verbose) console.log('Activity for first half of duration:')
	var firstHalfA = activity(0, 0, 1e9, Math.log(2)/36000, window.cycleParameters.duration*3600000/2 );
	if (verbose) console.log(firstHalfA);
	if (verbose) console.log('Activity at end of duration as computed from first half:')
	var finalAfromHalfA = activity(window.cycleParameters.duration*3600000/2, firstHalfA, 1e9, Math.log(2)/36000, window.cycleParameters.duration*3600000 );
	if (verbose) console.log(finalAfromHalfA);
	console.log('segmentation test passed: ' + (finalAfromHalfA == finalA) );

	//activity change in a single state (beam on or beam off) should be the same as calculated by the canonical function:
	function canonicalActivity(rate, lifetime, time, initialActivity){
		return rate * (1 - Math.exp(-1 * lifetime * time)) + initialActivity * Math.exp(-1 * lifetime * time);
	}

	if (verbose) console.log('acitivty prediction for first beam on period:')
	var activityCalc = activity(0, 1000, 10000, Math.log(2)/1, window.cycleParameters.beamOn);
	if (verbose) console.log(activityCalc);
	if (verbose) console.log('activity prediction from canonical function:')
	var canonActivity = canonicalActivity(scaleConstant*10000, Math.log(2)/1, window.cycleParameters.beamOn/1000, 1000);
	if (verbose) console.log(canonActivity);
	console.log('simple activity calculation test passed: ' + (activityCalc == canonActivity));

}