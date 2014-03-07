//scrape data out of the table, and put it in a convenient object.
function tableScrape(){
	window.isotopeList = {},
		elts;

	//get names
    var elts = document.querySelectorAll('x-inputTable tr');
    [].forEach.call(elts, function(elt){        
    	var name = elt.childNodes[0].childNodes[0].value,
    		halfLife = elt.childNodes[1].childNodes[0].value,
    		yield = elt.childNodes[2].childNodes[0].value,
    		visible = elt.childNodes[3].childNodes[0].checked,
    		tag;

    	if(name){
    		//create object in isotopeList with same key as name, minus whitespace:
    		tag = name.replace(/ /g,'');
    		window.isotopeList[tag] = 	{	'name' : name,
    										'lifetime' : Math.log(2) / halfLife,
    										'yield' : parseFloat(yield),
    										'visible' : visible
    									};
    	}
    });
}

//create the CSV string for the experiment graph if state == 'during', cycle graph if state == 'cycle', or after if state == 'after'
function generateDataCSV(state){
	var data = (state == 'cycle') ? 'Time[s]' : 'Time[h]',
		nPoints = 800,
		key, i, nextline;

	//CSV header row:
	for(key in window.isotopeList){
		data += ',';
		data += key;
	}
	if(data == 'Time[h]' || data == 'Time[s]')
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
				if(state == 'during')
					nextline += activityDuring(window.isotopeList[key].yield, window.isotopeList[key].lifetime, (window.cycleParameters.duration / nPoints)*i*3600);
				else if(state == 'cycle')
					nextline += activityDuring(window.isotopeList[key].yield, window.isotopeList[key].lifetime, (3*(window.cycleParameters.beamOn + window.cycleParameters.beamOff) / nPoints)*i/1000);
				else if(state == 'after')
					nextline += activityAfter(window.isotopeList[key].yield, window.isotopeList[key].lifetime, (1000 / nPoints)*i*3600);
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
		xlabel: (state=='during') ? 'Time [h]' : 'Time [s]',
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
						return number.toFixed((state=='during') ? 0 : 2) + ((state=='during') ? ' hours' : ' seconds');
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

//activity as a function of time, while contamination is accruing.
function activityDuring(yield, lifetime, time){
	var scaleConstant;

	//scale for each region:
	if(window.region == 'tape') scaleConstant = 0.89;
	else if(window.region == 'chamber') scaleConstant = 0.01;
	else if(window.region == 'beamline') scaleConstant = 0.1;

	return window.cycleParameters.dutyCycle * scaleConstant * yield * (1 - Math.exp(-1*lifetime*time));
}

//activity as a function of time, after experiment is finished.
function activityAfter(yield, lifetime, time){
	var peakActivity = activityDuring(yield, lifetime, window.cycleParameters.duration*3600);

	return peakActivity * Math.exp(-1*lifetime*time);
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
		'duration' : duration * durationUnit,
		'dutyCycle' : onTime / (onTime + offTime)
	}
	
	repaint();

	console.log(window.cycleParameters);
}

//return the value of a selected option from a <select> element
function selected(selectID){
    var select = document.getElementById(selectID),
        value = select.options[select.selectedIndex].value;

    return value;
}
