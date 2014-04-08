//initial setup
function setup(){

	//set up branding
	footerImage('footerImage', 2, '#444444');

	//kern title nicely
	var headlineWidth = document.getElementById('headline').offsetWidth,
		sublineWidth  = document.getElementById('subline').offsetWidth,
		sublineKern   = (headlineWidth - sublineWidth) / 6;
	document.getElementById('subline').style.letterSpacing = sublineKern;

	//plug isotope table addrow button in
	document.getElementById('addrow').onclick = function(){
		document.getElementById('isotopeTable').insertRow()
	}

	//plug in x-deck toggles
	document.getElementById('previousCardWrap').onclick = function(){
		document.getElementById('plotDeck').shufflePrev();
		document.getElementById('stateFlag').previousState();
		repaint();
	}
	document.getElementById('nextCardWrap').onclick = function(){
		document.getElementById('plotDeck').shuffleNext();
		document.getElementById('stateFlag').nextState();
		repaint();
	}
	//and StateIndex onclick callbacks:
	document.getElementById('stateFlag').gotoCallback = function(){
		document.getElementById('plotDeck').shuffleTo(document.getElementById('stateFlag').state);
		repaint();
	}

	//plug in x-inputTable callback
	document.getElementById('isotopeTable').changeCallback = function(){
		tableScrape();
		repaint();
	};

	//set up cycle parameter store:
	window.cycleParameters = {
		'beamOn' : parseInt(document.getElementById('onTime').value, 10),
		'beamOff' : parseInt(document.getElementById('offTime').value, 10),
		'cycleUnit' : parseInt(selected('selectBeamOffUnit'), 10),
		'cycleConversion' : parseInt(selected('selectBeamOffUnit'), 10),
		'cycleUnit' : ((parseInt(selected('selectBeamOffUnit'), 10)==1)? 'ms' : ((parseInt(selected('selectBeamOffUnit'), 10)=='1000')? 's':'min') ),
		'duration' : parseFloat(document.getElementById('expDuration').value),
		'durationUnit' : 'shifts',
		'durationConversion' : 12,
		'dutyCycle' : 0.5
	}

	//set up region selector store and callback:
	window.region = 'tape';
	var areaRadio = document.querySelectorAll('div#areaSelect input');
	[].forEach.call(areaRadio, function(rad){
		rad.onchange = function(){
			window.region = this.value;
			repaint();
		}
	});

	//plot something to begin with:
	tableScrape();
	repaint();
}

//scrape data out of the table, and put it in a convenient object.
function tableScrape(){
	window.isotopeList = {},
		elts,
		skipRow = true;

	//get names
    var elts = document.querySelectorAll('x-inputTable tr');
    [].forEach.call(elts, function(elt){        
    	if(!skipRow){
	    	var name = elt.childNodes[0].childNodes[0].value,
	    		halfLife = elt.childNodes[1].childNodes[0].value,
	    		halfLifeUnit = parseInt(selected(elt.childNodes[2].childNodes[0].id)),
	    		yield = elt.childNodes[3].childNodes[0].value,
	    		visible = elt.childNodes[4].childNodes[0].checked,
	    		tag;

	    	if(name){
	    		//create object in isotopeList with same key as name, minus whitespace:
	    		tag = name.replace(/ /g,'');
	    		window.isotopeList[tag] = 	{	'name' : name,
	    										'lifetime' : Math.log(2) / halfLife / halfLifeUnit,
	    										'yield' : parseFloat(yield),
	    										'visible' : visible
	    									};
	    	}
	    } else 
	    	skipRow = false;
    });
}

//return an activity in Bq, with a reasonable SI prefix:
function printBQ(activity){
	if(activity > 1000000) return (activity/1000000).toFixed(3) + ' MBq'
	else if(activity > 1000) return (activity/1000).toFixed(3) + ' kBq'
	else return (activity).toFixed(3) + ' Bq'
}

//return an activity in Ci, with a reasonable SI prefix:
function printCi(activity){
	var ci = activity / 3.7e+10;
	if(ci > 1e-3) return (ci*1000).toFixed(3) + ' mCi'
	else if(ci > 1e-6) return (ci*1000000).toFixed(3) + ' uCi'
	else return (ci*1000000000).toFixed(3) + ' nCi'
}

//create the CSV string for the full experiment duration
function generateFullProfileCSV(){
	var data, time,
		key, i, nextline, nTransitions,
		foundAnIsotope = false,
		propTime, 
		nStep;

	//when plotting activity for the full experiment duration, aliasing can become a problem when cycle times are short
	//compared to experiment duration and half lives are comparable to the cycle time.  It's not feasible to sufficiently
	//sample this periodic behavior over the whole experiment, so in this case we plot peak activity, which is monotonically
	//increasing and not periodic.  This can be achieved by invoking activitySteps, and considering a sample of the odd indexed
	//values, which correspond to activities at the moment beamOn transitions to beamOff.
	
	data = 'Time['+window.cycleParameters.durationUnit+']';

	//CSV header row:
	for(key in window.isotopeList){
		if(window.isotopeList[key].visible){
			foundAnIsotope = true;
			data += ',';
			data += key;
			nTransitions = window.transitionActivities[key].length //all the same across keys, doesn't matter which one we use
		}
	}

	//decide how many points to sample - shoot for about 1000 maxima spread over the experiment
	nStep = Math.floor(nTransitions / 2); // == how many maxima
	nStep = Math.floor(nStep/1000); //skip this many maxima between points to cover the experiment in about 1000 points.
	nPoints = Math.floor(nTransitions / 2 / nStep);

	if(!foundAnIsotope)
		data += ','; //blank column for page load
	data += '\n';	

	for(i=0; i<nPoints; i++){
		//add the x-value to the list:
		time = window.cycleParameters.beamOn + i*nStep*(window.cycleParameters.beamOn + window.cycleParameters.beamOff);
		data += time / 3600000 / window.cycleParameters.durationConversion;

		//add a y-value for each isotope:
		nextline = '';
		for(key in window.isotopeList){
			if(window.isotopeList[key].visible){
				nextline += ',' + (window.transitionActivities[key][i*nStep*2 + 1] + chamberOffset(time, key));				
			}
		}
		data += nextline + '\n';
	}

	//an empty graph for page load
	if(!nPoints){
		data += '0,0\n1,0';
	}

	return data;
}

//create the CSV string for the first three cycles
function generateFirst3CyclesCSV(){
	var data, time,
		nPoints = 800,
		foundAnIsotope = false,
		key, i, nextline,
		propTime, 
		tempTerm = 0,
		nStep;
	
	data = 'Time['+window.cycleParameters.cycleUnit+']';

	//CSV header row
	for(key in window.isotopeList){
		if(window.isotopeList[key].visible){
			foundAnIsotope = true;
			data += ',';
			data += key;
		}
	}
	if(!foundAnIsotope)
		data += ','; //blank column for page load
	data += '\n';

	for(i=0; i<nPoints; i++){
		//add the x-value to the list:
		time = (3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff)/nPoints)*i;
		data += time/window.cycleParameters.cycleConversion;

		//add a y-value for each isotope:
		nextline = '';
		for(key in window.isotopeList){
			if(window.isotopeList[key].visible){
				nextline += ',' + (activityNew(window.transitionActivities[key], window.region, window.isotopeList[key].yield, window.isotopeList[key].lifetime, time) + chamberOffset(time, key))
			}
		}
		//an empty graph for page load
		if(nextline == ''){
			nextline += ',';
			nextline += '0';
		}
		data += nextline + '\n';
	}

	return data;
}

//create the CSV string for the last three cycles 
//(note this is actually the last 3 cycles worth of time, if the expt duration % cycle time != 0 then there will be a corresponding offset here)
function generateLast3CyclesCSV(){
	var data, time,
		nPoints = 800,
		foundAnIsotope = false,
		key, i, nextline,
		propTime, 
		tempTerm = 0,
		nStep;
	
	data = 'Time['+window.cycleParameters.cycleUnit+']';

	//CSV header row
	for(key in window.isotopeList){
		if(window.isotopeList[key].visible){
			foundAnIsotope = true;
			data += ',';
			data += key;
		}
	}
	if(!foundAnIsotope)
		data += ','; //blank column for page load
	data += '\n';

	for(i=0; i<nPoints; i++){
		//add the x-value to the list:
		time = window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000 - 3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff) + (3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff)/nPoints)*i
		data += time/window.cycleParameters.cycleConversion;

		//add a y-value for each isotope:
		nextline = '';
		for(key in window.isotopeList){
			if(window.isotopeList[key].visible){
				nextline += ',' + (activityNew(window.transitionActivities[key], window.region, window.isotopeList[key].yield, window.isotopeList[key].lifetime, time) + chamberOffset(time, key));
			}
		}
		//an empty graph for page load
		if(nextline == ''){
			nextline += ',';
			nextline += '0';
		}
		data += nextline + '\n';
	}

	return data;
}

//create the CSV string for the 1000-hour post-experiment decay
function generatePostExptCSV(){
	var data, time,
		nPoints = 800,
		foundAnIsotope = false,
		key, i, nextline,
		propTime, 
		tempTerm = 0,
		nStep,
		finalActivity = {};

	data = 'Time[h]';

	//CSV header row & activity at experiment's end:
	for(key in window.isotopeList){
		if(window.isotopeList[key].visible){
			foundAnIsotope = true;
			data += ',';
			data += key;
			finalActivity[key] = activityNew(window.transitionActivities[key], window.region, window.isotopeList[key].yield, window.isotopeList[key].lifetime, window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000);
		}
	}

	if(!foundAnIsotope)
		data += ','; //blank column for page load
	data += '\n';

	for(i=0; i<nPoints; i++){
		//add the x-value to the list:
		time = (1000 / nPoints)*i*3600000;
		data += (1000 / nPoints)*i;

		//add a y-value for each isotope:
		nextline = '';
		for(key in window.isotopeList){
			if(window.isotopeList[key].visible){
				nextline += ',' + finalActivity[key]*Math.exp(-window.isotopeList[key].lifetime * time/1000);
			}
		}
		//an empty graph for page load
		if(nextline == ''){
			nextline += ',';
			nextline += '0';
		}
		data += nextline + '\n';
	}

	return data;
}

//generate the dygraph for the full experiment duration, and refresh the summary table
function generateDygraph(divID, CSV, title, xlabel, units){
	window.duringPlot = new Dygraph(document.getElementById(divID), CSV, {
		title: title,
		xlabel: xlabel,
		ylabel: 'Activity [counts/s]',
		sigFigs: 2,
		strokeWidth: 4,
		yAxisLabelWidth: 75,
		xAxisHeight: 30,
		highlightCircleSize: 6,
		titleHeight: 50,
		legend: 'always',
		colors: ['#F1C40F', '#2ECC71', '#E74C3C', '#ECF0F1', '#1ABC9C', '#E67E22', '#9B59B6'],
		axes:{
			x: {
				valueFormatter: function(number, opts, dygraph){
						return number.toFixed(0) + units;
				}
			}
		}
	});

	regenSummaryTable();
}

//regenerate the activity summary table
function regenSummaryTable(){
	var table = document.getElementById('summaryActivity'),
		row, isotope, chamberRes, tapeRes, tapeResLater,
		postChamber, postTape, postTapeLater,
		chamberTransitionActivities={}, tapeTransitionActivities={},
		key;


	for(key in window.isotopeList){
		chamberTransitionActivities[key] = activitySteps(regionScale('chamber') * window.isotopeList[key].yield, window.isotopeList[key].lifetime);
		tapeTransitionActivities[key] = activitySteps(regionScale('tape') * window.isotopeList[key].yield, window.isotopeList[key].lifetime);
	}

	//clear table
	table.innerHTML = '';
	//generate table header
	row = document.createElement('tr');
	row.setAttribute('id', 'titleRow');
	table.appendChild(row);

	isotope = document.createElement('td');
	isotope.setAttribute('id', 'titleIsotope');
	document.getElementById('titleRow').appendChild(isotope);
	document.getElementById('titleIsotope').innerHTML = 'Isotope';

	chamberRes = document.createElement('td');
	chamberRes.setAttribute('id', 'titleChamberRes');
	document.getElementById('titleRow').appendChild(chamberRes);
	document.getElementById('titleChamberRes').innerHTML = 'Chamber - Post Expt.';

	tapeRes = document.createElement('td');
	tapeRes.setAttribute('id', 'titleTapeRes');
	document.getElementById('titleRow').appendChild(tapeRes);
	document.getElementById('titleTapeRes').innerHTML = 'Tape Box - Post Expt.';

	tapeResLater = document.createElement('td');
	tapeResLater.setAttribute('id', 'titleTapeResLater');
	document.getElementById('titleRow').appendChild(tapeResLater);
	document.getElementById('titleTapeResLater').innerHTML = 'Tape Box - 12h Later'

	//empty summary table cells:
	for(key in window.isotopeList){
		row = document.createElement('tr');
		row.setAttribute('id', key+'row');
		table.appendChild(row);

		isotope = document.createElement('td');
		isotope.setAttribute('id', key+'Isotope');
		document.getElementById(key+'row').appendChild(isotope);
		document.getElementById(key+'Isotope').innerHTML = key;

		chamberRes = document.createElement('td');
		chamberRes.setAttribute('id', key+'ChamberRes');
		document.getElementById(key+'row').appendChild(chamberRes);

		tapeRes = document.createElement('td');
		tapeRes.setAttribute('id', key+'TapeRes');
		document.getElementById(key+'row').appendChild(tapeRes);

		tapeResLater = document.createElement('td');
		tapeResLater.setAttribute('id', key+'TapeResLater');
		document.getElementById(key+'row').appendChild(tapeResLater);

		//populate summary table with final entries in lastActivity
		postChamber = activityNew(chamberTransitionActivities[key], 'chamber', window.isotopeList[key].yield, window.isotopeList[key].lifetime, (window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000));
		postTape = activityNew(tapeTransitionActivities[key], 'tape', window.isotopeList[key].yield, window.isotopeList[key].lifetime, (window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000));
		postTapeLater = activityNew(tapeTransitionActivities[key], 'tape', window.isotopeList[key].yield, window.isotopeList[key].lifetime, (window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000))*Math.exp(-window.isotopeList[key].lifetime*12*3600);
		document.getElementById(key+'ChamberRes').innerHTML = printBQ(postChamber) + '<br>' + printCi(postChamber)
		document.getElementById(key+'TapeRes').innerHTML = printBQ(postTape) + '<br>' + printCi(postTape)
		document.getElementById(key+'TapeResLater').innerHTML = printBQ(postTapeLater) + '<br>' + printCi(postTapeLater)
	}
}

//starting with initial activity <A0>, return Activity after <time>, under beam <rate> for isotope with <lifetime>
function stepActivity(A0, rate, lifetime, time){
	return rate * (1 - Math.exp(-1*lifetime*time)) + A0 * Math.exp(-1*lifetime*time);
}

//return an array giving the activity at each beam switch (off->on and on->off) for an isotope with 
//beam-on <rate>[counts/s] & isotope <lifetime>[s-1], up to <maxtime>[ms] - if <maxtime>==0, defaults
//to full experiment length
function activitySteps(rate, lifetime, maxtime){
	var A_n = [0], //array of activities at each beam transition
		timeRemaining = maxtime, //time [ms] remaining in experiment
		a = rate * (1 - Math.exp(-lifetime*window.cycleParameters.beamOn/1000)),
		b = Math.exp(-lifetime*window.cycleParameters.beamOff/1000),
		c = Math.exp(-lifetime*window.cycleParameters.beamOn/1000)

	if(!maxtime)
		timeRemaining = window.cycleParameters.duration * window.cycleParameters.durationConversion * 3600000;
console.log([maxtime, timeRemaining])
	while(timeRemaining > 0){
		//beam on:
		A_n[A_n.length] = a + A_n[A_n.length-1] * c;
		timeRemaining -= window.cycleParameters.beamOn;
		if(timeRemaining > 0){
			//beam off
			A_n[A_n.length] = A_n[A_n.length-1] * b;
			timeRemaining -= window.cycleParameters.beamOff;
		}
	}

	return A_n;
}	

//compute the activity at time <t>[ms] given <rate>[counts/s] & isotope <lifetime>[s-1] in <region>, with activitySteps pre-evaluated in <A_n>:
function activityNew(A_n, region, rate, lifetime, t){
	var A, i, time;

	//determine which entry in A_n immediately preceeds time t:
	i = Math.floor(t / (window.cycleParameters.beamOff + window.cycleParameters.beamOn)) * 2; //2 steps each full cycle
	if( (t % (window.cycleParameters.beamOff + window.cycleParameters.beamOn)) >= window.cycleParameters.beamOn)
		i++; //extra step if the terminating cycle had enough time to finish it's beam on period.
	//determine time into current transition:
	time = (t % (window.cycleParameters.beamOff + window.cycleParameters.beamOn));
	if(time >= window.cycleParameters.beamOn)
		time -= window.cycleParameters.beamOn;

	//propagate the activity at A_n[i] to A(t):
	//i even -> beam is on at time t
	if(i%2 == 0){
		A = rate * regionScale(region) * (1 - Math.exp(-lifetime*time/1000)) + A_n[i]*Math.exp(-lifetime*time/1000);
	//i odd -> beam is off at time t
	} else {
		A = A_n[i]*Math.exp(-lifetime*time/1000);
	}

	return A;
}


//the chamber sees not only the 1% activity that backscatters into it,
//but some extra activity from the 89% that is deposited on the tape in the
//beamspot; this extra term is independent of cycle number though, since
//the activity that builds up there is reset to 0 when the tape is cycled into the 
//tape box between beam off -> beam on.  Thus we can just caluclate it as a 
//simple correction to be tacked on at the end, that doesn't depend on where in the
//experiment we are.
//<time>[ms] into experiment, <key> from window.isotopeList indicating which isotope we're doing this for
function chamberOffset(time, key){
	var propTime, tempTerm;

	if(window.region != 'chamber') return 0;

	propTime = time % (window.cycleParameters.beamOn + window.cycleParameters.beamOff) //time into this cycle
	if (propTime < window.cycleParameters.beamOn) //still in irradiation step:
		tempTerm = stepActivity(0, 0.89*window.isotopeList[key].yield, window.isotopeList[key].lifetime, propTime/1000);
	else{ //completed irradiation step, now in decay step
		tempTerm = stepActivity(0, 0.89*window.isotopeList[key].yield, window.isotopeList[key].lifetime, window.cycleParameters.beamOn/1000);
		tempTerm = stepActivity(tempTerm, 0, window.isotopeList[key].lifetime, (propTime - window.cycleParameters.beamOn)/1000);
	}

	return tempTerm;
}
//repaint dygraphs as necessary:
function repaint(){
	var onDisplay = document.getElementById('stateFlag').state,
		key, 
		scaleConstant = regionScale(window.region);

	//repaint full experiment view
	if(onDisplay == 0){
		window.transitionActivities = {}
		//regenerate full activity lattice
		for(key in window.isotopeList){
			window.transitionActivities[key] = activitySteps(scaleConstant * window.isotopeList[key].yield, window.isotopeList[key].lifetime)
		}
		generateDygraph('duringPlot', generateFullProfileCSV(), 'Peak Activity During Experiment', 'Time ['+window.cycleParameters.durationUnit+']', ' '+window.cycleParameters.durationUnit);
	//repaint first 3 cycles
	} else if(onDisplay == 1){
		window.transitionActivities = {}
		//regenerate activity lattice
		for(key in window.isotopeList){
			console.log(key)
			window.transitionActivities[key] = activitySteps(scaleConstant * window.isotopeList[key].yield, window.isotopeList[key].lifetime, 3*(window.cycleParameters.beamOn + cycleParameters.beamOff));
		}
		generateDygraph('cyclePlot', generateFirst3CyclesCSV(), 'Activity Over First Three Cycles', 'Time ['+window.cycleParameters.cycleUnit+']', ' '+window.cycleParameters.cycleUnit);
	//repaint last 3 cycles
	}else if(onDisplay == 2){
		//regenerate full activity lattice
		for(key in window.isotopeList){
			window.transitionActivities[key] = activitySteps(scaleConstant * window.isotopeList[key].yield, window.isotopeList[key].lifetime)
		}
		generateDygraph('lastCyclesPlot', generateLast3CyclesCSV(), 'Activity Over Last Three Cycles', 'Time ['+window.cycleParameters.cycleUnit+']', ' '+window.cycleParameters.cycleUnit);
	//repaint post-experiment decay
	} else if(onDisplay == 3){
		//regenerate full activity lattice
		for(key in window.isotopeList){
			window.transitionActivities[key] = activitySteps(scaleConstant * window.isotopeList[key].yield, window.isotopeList[key].lifetime);
		}		
		generateDygraph('afterPlot', generatePostExptCSV(), 'Activity After Experiment', 'Time [h]', ' hours');
	}
}

//scrape parameters out of cycle definition table
function cycleParameterScrape(){
	var onTime = parseInt(document.getElementById('onTime').value, 10),
		onUnit = parseInt(selected('selectBeamOnUnit'), 10),
		offTime = parseInt(document.getElementById('offTime').value, 10),
		offUnit = parseInt(selected('selectBeamOffUnit'), 10),
		duration = parseFloat(document.getElementById('expDuration').value),
		durationUnit = parseInt(selected('selectExpDurationUnit'), 10);

	//beamOn /Off times are all converted to ms, and exp duration to hours.
	window.cycleParameters = {
		'beamOn' : onTime * onUnit,
		'beamOff' : offTime * offUnit,
		'cycleConversion' : offUnit,
		'cycleUnit' : ((offUnit==1)? 'ms' : ((offUnit=='1000')? 's':'min') ),
		'duration' : duration,
		'durationUnit' : (durationUnit == 1) ? 'h' : ((durationUnit == 12) ? 'shifts' : 'days'),
		'durationConversion' : durationUnit,
		'dutyCycle' : onTime / (onTime + offTime)
	}
	repaint();
}

//return the value of a selected option from a <select> element
function selected(selectID){
    var select = document.getElementById(selectID),
        value = select.options[select.selectedIndex].value;

    return value;
}

//return the appropriate scale constant as a function of <region>:
function regionScale(region){
	if(region == 'tape') return 0.89;
	else if(region == 'chamber') return 0.01;
	else if(region == 'beamline') return 0.1;
}