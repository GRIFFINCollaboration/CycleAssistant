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

//create the CSV string for the experiment graph if state == 'during', first 3 cycles graph if state == 'cycle',  
//last 3 cycles if state =='lastCycles' or after if state == 'after'
function generateDataCSV(state){
	var data, time,
		nPoints = 800,
		key, i, nextline,
		foundAnIsotope = false,
		lastActivity = {},
		endOfRunActivity = {},
		propTime, 
		tempTerm = 0,
		table = document.getElementById('summaryActivity'),
		row, isotope, chamberRes, tapeRes, tapeResLater,
		postChamber, postTape, postTapeLater;

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

	if(state == 'cycle' || state == 'lastCycles') data = 'Time['+window.cycleParameters.cycleUnit+']';
	else if(state == 'during') data = 'Time['+window.cycleParameters.durationUnit+']';
	else if(state == 'after') data = 'Time[h]';

	//CSV header row and empty summary table cells:
	for(key in window.isotopeList){
		if(window.isotopeList[key].visible){
			foundAnIsotope = true;
			data += ',';
			data += key;
			lastActivity[key] = 0; //start activities at 0, unless plotting last three cycles:
			if(state == 'lastCycles') lastActivity[key] = activity(window.region, 0, 0, window.isotopeList[key].yield, window.isotopeList[key].lifetime, window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000 - (window.cycleParameters.beamOn+window.cycleParameters.beamOff)*3 )
			endOfRunActivity[key] = activity(window.region, 0, 0, window.isotopeList[key].yield, window.isotopeList[key].lifetime, window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000)
		}

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

	}

	if(!foundAnIsotope)
		data += ','; //blank column for page load
	data += '\n';	

	for(i=0; i<nPoints; i++){
		//add the x-value to the list:
		if(state == 'during'){
			time = (window.cycleParameters.duration*window.cycleParameters.durationConversion / nPoints*3600000)*i;
			data += (window.cycleParameters.duration / nPoints)*i;
		} else if(state == 'cycle'){
			time = (3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff)/nPoints)*i;
			data += time/window.cycleParameters.cycleConversion;
		} else if(state == 'lastCycles'){
			//time in ms
			time = window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000 - 3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff) + (3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff)/nPoints)*i
			//append time in whatever units selected to x-data series.
			data += time/window.cycleParameters.cycleConversion;
		} else if (state == 'after')
			data += (1000 / nPoints)*i;
		//add a y-value for each isotope:
		nextline = '';
		for(key in window.isotopeList){
			if(window.isotopeList[key].visible){

				//the chamber sees not only the 1% activity that backscatters into it,
				//but some extra activity from the 89% that is deposited on the tape in the
				//beamspot; this extra term is independent of cycle number though, since
				//the activity that builds up there is reset to 0 when the tape is cycled into the 
				//tape box between beam off -> beam on.  Thus we can just caluclate it as a 
				//simple correction to be tacked on at the end, that doesn't depend on where in the
				//experiment we are.
				if(window.region == 'chamber' && state!='after'){
					propTime = time % (window.cycleParameters.beamOn + window.cycleParameters.beamOff) //time into this cycle
					if (propTime < window.cycleParameters.beamOn) //still in irradiation step:
						tempTerm = stepActivity(0, 0.89*window.isotopeList[key].yield, window.isotopeList[key].lifetime, propTime/1000);
					else{ //completed irradiation step, now in decay step
						tempTerm = stepActivity(0, 0.89*window.isotopeList[key].yield, window.isotopeList[key].lifetime, window.cycleParameters.beamOn/1000);
						tempTerm = stepActivity(tempTerm, 0, window.isotopeList[key].lifetime, (propTime - window.cycleParameters.beamOn)/1000);
					}
				}

				nextline += ',';
				if(state == 'during'){
					lastActivity[key] = activity(window.region, Math.max(0, (window.cycleParameters.duration*window.cycleParameters.durationConversion / nPoints)*(i-1)*3600000), lastActivity[key], window.isotopeList[key].yield, window.isotopeList[key].lifetime, time )
					nextline += (lastActivity[key]+tempTerm);
				} else if(state == 'cycle'){
					lastActivity[key] = activity(window.region, Math.max(0, (3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff) / nPoints)*(i-1) ), lastActivity[key], window.isotopeList[key].yield, window.isotopeList[key].lifetime, time );
					nextline += (lastActivity[key]+tempTerm);
				} else if(state == 'lastCycles'){
					lastActivity[key] = activity(window.region, Math.max(window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000 - 3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff), time - (3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff)/nPoints)), lastActivity[key], window.isotopeList[key].yield, window.isotopeList[key].lifetime, time);
					nextline += (lastActivity[key]+tempTerm);
				} else if(state == 'after')
					nextline += activityAfter(endOfRunActivity[key], window.isotopeList[key].lifetime, (1000 / nPoints)*i*3600);
			}
		}
		//an empty graph for page load
		if(nextline == ''){
			nextline += ',';
			nextline += '0';
		}
		data += nextline + '\n';
	}

	//populate summary table with final entries in lastActivity
	for(key in window.isotopeList){
		postChamber = activity('chamber', 0, 0, window.isotopeList[key].yield, window.isotopeList[key].lifetime, (window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000));
		postTape = activity('tape', 0, 0, window.isotopeList[key].yield, window.isotopeList[key].lifetime, (window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000));
		postTapeLater = activity('tape', 0, 0, window.isotopeList[key].yield, window.isotopeList[key].lifetime, (window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000))*Math.exp(-window.isotopeList[key].lifetime*12*3600);
		document.getElementById(key+'ChamberRes').innerHTML = printBQ(postChamber) + '<br>' + printCi(postChamber)
		document.getElementById(key+'TapeRes').innerHTML = printBQ(postTape) + '<br>' + printCi(postTape)
		document.getElementById(key+'TapeResLater').innerHTML = printBQ(postTapeLater) + '<br>' + printCi(postTapeLater)
	}

	return data;
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

//generate the dygraph for the <state>, either 'during' or 'cycle' or 'lastCycles':
function generateDuringGraph(state){
	window.duringPlot = new Dygraph(document.getElementById(state+'Plot'), generateDataCSV(state), {
		title: (state=='during') ? 'Activity During Experiment' : ((state=='cycle') ? 'Activity Over First Three Cycles' : 'Activity Over Last Three Cycles'),
		xlabel: (state=='during') ? 'Time ['+window.cycleParameters.durationUnit+']' : 'Time ['+window.cycleParameters.cycleUnit+']',
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
						var units;
						if(state == 'during') units = ' '+window.cycleParameters.durationUnit;
						else if(state == 'cycle' || state == 'lastCycles') units = ' '+window.cycleParameters.cycleUnit;
						//else if(state == 'after') units = ' hours'
						return number.toFixed((state=='during') ? 0 : 2) + units;
				}
			}
		}
	});
}

//generate the dygraph for the 'after' state:
function generateAfterGraph(){
	window.afterPlot = new Dygraph(document.getElementById('afterPlot'), generateDataCSV('after'), {
		title: 'Activity After Experiment',
		xlabel: 'Time [h]',
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
						return number.toFixed() + ' hours';
				},
				sigFigs: 2
			}
		}
	});
}

//activity as a function of time, after experiment is finished.
function activityAfter(peakActivity, lifetime, time){
	return peakActivity * Math.exp(-1*lifetime*time);
}

//starting with initial activity <A0>, return Activity after <time>, under beam <rate> for isotope with <lifetime>
function stepActivity(A0, rate, lifetime, time){
	return rate * (1 - Math.exp(-1*lifetime*time)) + A0 * Math.exp(-1*lifetime*time);
}

//calculate the activity at time <t>[ms], given a beam-on <rate>[counts/s], isotope <lifetime>[s-1], 
//and that the activity was <A0>[counts/s] at time <t0>[ms], t and t0 in ms
function activity(region, t0, A0, rate, lifetime, t){
	var beamOn, firstPeriodTimeElapsed,
		propTime,
		stepTime = t0,
		stepA = A0,
		scaleConstant, 
		tempTerm = 0;

	//scale for each region:
	if(region == 'tape') scaleConstant = 0.89;
	else if(region == 'chamber') scaleConstant = 0.01;
	else if(region == 'beamline') scaleConstant = 0.1;

	//figure out if beam is on or off at time t0, and how long its been in that state:
	firstPeriodTimeElapsed = t0 % (window.cycleParameters.beamOn + window.cycleParameters.beamOff);
	if(firstPeriodTimeElapsed < window.cycleParameters.beamOn) beamOn = true; //ie beam is on and has been on for <firstPeriodTimeElapsed>
	else{
		firstPeriodTimeElapsed -= window.cycleParameters.beamOn;  //beam has been off for this long
		beamOn = false; //beam is off
	}

	//finish the state the beam was in at t0, if there's enough time before t.
	if(beamOn) //beam is on
		propTime = window.cycleParameters.beamOn - firstPeriodTimeElapsed;
	else //beam is off
		propTime = window.cycleParameters.beamOff - firstPeriodTimeElapsed;
	//cut off propagation at time t if necessary:
	propTime = Math.min(propTime, t-t0);
	//propagate to the end of this state:
	if(beamOn)
		stepA = stepActivity(stepA, scaleConstant*rate, lifetime, propTime/1000); //lifetimes recorded in seconds
	else
		stepA = stepActivity(stepA, 0, lifetime, propTime/1000);
	stepTime += propTime;

	//step through whole cycles until we get as close to t without going over 
	while(stepTime + window.cycleParameters.beamOn + window.cycleParameters.beamOff < t){
		//switch the beam state
		beamOn = !beamOn;

		if(beamOn){
			propTime = window.cycleParameters.beamOn;
			stepA = stepActivity(stepA, scaleConstant*rate, lifetime, propTime/1000);
		}
		else{
			propTime = window.cycleParameters.beamOff;
			stepA = stepActivity(stepA, 0, lifetime, propTime/1000);
		}
		stepTime += propTime;

	}

	//we're now less than one cycle away from t.  Attempt to propagate one step:
	beamOn = !beamOn;
	if(beamOn) //beam is on
		propTime = window.cycleParameters.beamOn;
	else //beam is off
		propTime = window.cycleParameters.beamOff;
	//cut off propagation at time t if necessary:
	propTime = Math.min(propTime, t-stepTime);
	//propagate to the end of this state:
	if(beamOn)
		stepA = stepActivity(stepA, scaleConstant*rate, lifetime, propTime/1000);
	else
		stepA = stepActivity(stepA, 0, lifetime, propTime/1000);
	stepTime += propTime;	

	//return if we've reached t:
	if(stepTime == t)
		return stepA + tempTerm;

	//finish the last step if we didn't just return:
	beamOn = !beamOn;
	propTime = t-stepTime;
	//propagate to the end of this state:
	if(beamOn)
		stepA = stepActivity(stepA, scaleConstant*rate, lifetime, propTime/1000);
	else
		stepA = stepActivity(stepA, 0, lifetime, propTime/1000);

	return stepA + tempTerm;

}

//repaint dygraphs as necessary:
function repaint(){
	var onDisplay = document.getElementById('stateFlag').state;

	if(onDisplay == 0)
		generateDuringGraph('during');
	else if(onDisplay == 1)
		generateDuringGraph('cycle');
	else if(onDisplay == 2)
		generateDuringGraph('lastCycles');
	else if(onDisplay == 3)
		generateAfterGraph();
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
