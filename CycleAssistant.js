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

//create the CSV string for the experiment graph if state == 'during', cycle graph if state == 'cycle', or after if state == 'after'
function generateDataCSV(state){
	var data,
		nPoints = 800,
		key, i, nextline,
		foundAnIsotope = false,
		lastActivity = {},
		endOfRunActivity = {};

	if(state == 'cycle') data = 'Time[s]';
	else if(state == 'during') data = 'Time['+window.cycleParameters.durationUnit+']';
	else if(state == 'after') data = 'Time[h]';

	//CSV header row:
	for(key in window.isotopeList){
		if(window.isotopeList[key].visible){
			foundAnIsotope = true;
			data += ',';
			data += key;
			lastActivity[key] = 0; //start activities at 0
			endOfRunActivity[key] = activity(0, 0, window.isotopeList[key].yield, window.isotopeList[key].lifetime, window.cycleParameters.duration*window.cycleParameters.durationConversion*3600000)
		}
	}

	if(!foundAnIsotope)
		data += ','; //blank column for page load
	data += '\n';	

	for(i=0; i<nPoints; i++){
		//add the x-value to the list:
		if(state == 'during')
			data += (window.cycleParameters.duration / nPoints)*i;
		else if(state == 'cycle')
			data += (3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff)/nPoints/1000)*i
		else if (state == 'after')
			data += (1000 / nPoints)*i;
		//add a y-value for each isotope:
		nextline = '';
		for(key in window.isotopeList){
			if(window.isotopeList[key].visible){
				nextline += ',';
				if(state == 'during'){
					lastActivity[key] = activity(Math.max(0, (window.cycleParameters.duration*window.cycleParameters.durationConversion / nPoints)*(i-1)*3600000), lastActivity[key], window.isotopeList[key].yield, window.isotopeList[key].lifetime, (window.cycleParameters.duration*window.cycleParameters.durationConversion / nPoints)*i*3600000 )
					nextline += lastActivity[key];
				} else if(state == 'cycle'){
					lastActivity[key] = activity(Math.max(0, (3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff) / nPoints)*(i-1) ), lastActivity[key], window.isotopeList[key].yield, window.isotopeList[key].lifetime, (3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff) / nPoints)*i )
					nextline += lastActivity[key];
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

	return data;
}

//generate the dygraph for the <state>, either 'during' or 'cycle':
function generateDuringGraph(state){
	window.duringPlot = new Dygraph(document.getElementById(state+'Plot'), generateDataCSV(state), {
		title: (state=='during') ? 'Activity During Experiment' : 'Activity Over Three Cycles',
		xlabel: (state=='during') ? 'Time ['+window.cycleParameters.durationUnit+']' : 'Time [s]',
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
						if(state == 'during') units = ' '+window.cycleParameters.durationUnit
						else if(state == 'cycle') units = ' seconds'
						else if(state == 'after') units = ' hours'
						return number.toFixed((state=='during') ? 0 : 2) + units;
				},
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
function activity(t0, A0, rate, lifetime, t){
	var beamOn, firstPeriodTimeElapsed,
		propTime,
		stepTime = t0,
		stepA = A0,
		scaleConstant;

	//scale for each region:
	if(window.region == 'tape') scaleConstant = 0.89;
	else if(window.region == 'chamber') scaleConstant = 0.01;
	else if(window.region == 'beamline') scaleConstant = 0.1;

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
		return stepA;

	//finish the last step if we didn't just return:
	beamOn = !beamOn;
	propTime = t-stepTime;
	//propagate to the end of this state:
	if(beamOn)
		stepA = stepActivity(stepA, scaleConstant*rate, lifetime, propTime/1000);
	else
		stepA = stepActivity(stepA, 0, lifetime, propTime/1000);

	return stepA;

}

//repaint dygraphs as necessary:
function repaint(){
	var onDisplay = document.getElementById('stateFlag').state;

	if(onDisplay == 0)
		generateDuringGraph('during');
	else if(onDisplay == 1)
		generateDuringGraph('cycle');
	else if(onDisplay == 2)
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
