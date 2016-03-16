///////////////////////
// dom manipulation
///////////////////////

function addBeamIsotope(){
    //insert the html for a new row in the beam isotope table

    var table = document.getElementById('beamCocktailTable').getElementsByTagName('tbody'),
        newRow = document.createElement('tr');

    newRow.setAttribute('id', dataStore.isotopeIndex + 'row');
    newRow.innerHTML = Mustache.to_html(
        document.getElementById('cocktailRow').innerHTML, 
        {
            'id': dataStore.isotopeIndex
        }
    );

    table[0].appendChild(newRow) 

    //also tack on a row to the summary table
    addSummaryRow(dataStore.isotopeIndex + 'row');

    dataStore.isotopeIndex += 1;
    repopulateBeamList()
}

function removeBeamIsotope(targetRowID){
    //remove a beam isotope row 

    var node = document.getElementById(targetRowID);
    node.parentNode.removeChild(node);

    //also remove the summary row:
    node = document.getElementById(targetRowID+'Summary');
    node.parentNode.removeChild(node);

    parseBeamList()
}

function addSummaryRow(rowID){
    //add a row to the summary table

    var table = document.getElementById('summaryActivity').getElementsByTagName('tbody'),
        newRow = document.createElement('tr');

    newRow.setAttribute('id', rowID+'Summary');
    newRow.innerHTML = Mustache.to_html(
        document.getElementById('summaryRow').innerHTML, 
        {
            'key': rowID+'Summary'
        }
    );

    table[0].appendChild(newRow);
}

////////////////////////
// data extraction
////////////////////////

function parseBeamList(){
    //parse the beam cocktail table into dataStore.beamSpecies, and replot

    var isotopes = document.getElementById('beamCocktailTable').getElementsByTagName('tr'),
        i, index, properties, halfLife, halfLifeUnit;

    dataStore.beamSpecies = [];

    for(i=1; i<isotopes.length; i++){
        index = isotopes[i].id.slice(0,-3)

        halfLife = parseFloat(document.getElementById(index + 'halfLife').value);
        halfLifeUnit = parseInt(getSelected(index + 'halfLifeUnit'), 10);

        dataStore.beamSpecies.push({
            "name": document.getElementById(index + 'name').value,
            "halfLife": halfLife,
            "halfLifeUnit": halfLifeUnit,
            "lifetime": Math.log(2) / halfLife / halfLifeUnit, // in s-1
            "yield": parseFloat(document.getElementById(index + 'yield').value),
            "enabled": document.getElementById(index + 'enabled').checked,
            "rowID": isotopes[i].id
        })
    }

    parseConfigTable();
    repaint();
    populateSummaryTable();
}

function parseConfigTable(){
    //parse the config table into dataStore.config

    dataStore.config = {
        "region": checkedRadio('region').value,
        "beamOn": parseInt(document.getElementById('beamOn').value, 10),
        "beamOnUnit": parseInt(getSelected('beamOnUnit'), 10),
        "beamOff": parseInt(document.getElementById('beamOff').value, 10),
        "beamOffUnit": parseInt(getSelected('beamOffUnit'), 10),
        "exptDuration": parseInt(document.getElementById('exptDuration').value, 10),
        "exptDurationUnit": parseInt(getSelected('exptDurationUnit'), 10)
    }

    if(dataStore.config.exptDurationUnit == 1)
        dataStore.config.exptDurationScale = 'h';
    else if(dataStore.config.exptDurationUnit == 24)
        dataStore.config.exptDurationScale = 'days';
    else
        dataStore.config.exptDurationScale = 'shifts';

    repaint();

}

function repopulateBeamList(){
    //repopulate the beam cocktail list with whatever is in the dataStore
    //for use after manipulating the html of the table

    var i, index,
        rows = document.getElementById('beamCocktailTable').getElementsByTagName('tr')

    for(i=0; i<dataStore.beamSpecies.length; i++){
        index = rows[i+1].id.slice(0,-3);

        document.getElementById(index + 'name').value = dataStore.beamSpecies[i].name;
        document.getElementById(index + 'halfLife').value = dataStore.beamSpecies[i].halfLife;
        document.getElementById(index + 'halfLifeUnit').value = dataStore.beamSpecies[i].halfLifeUnit;
        document.getElementById(index + 'yield').value = dataStore.beamSpecies[i].yield;
        document.getElementById(index + 'enabled').checked = dataStore.beamSpecies[i].enabled

    }
}

///////////////////////////////////
// physics / data generation
///////////////////////////////////

function generatePeakData(){
    var data, time,
        i, j, nTransitions,
        nStep,
        beamOn = dataStore.config.beamOn*dataStore.config.beamOnUnit, // in ms
        beamOff = dataStore.config.beamOff*dataStore.config.beamOffUnit; // in ms

    //when plotting activity for the full experiment duration, aliasing can become a problem when cycle times are short
    //compared to experiment duration and half lives are comparable to the cycle time.  It's not feasible to sufficiently
    //sample this periodic behavior over the whole experiment, so in this case we plot peak activity, which is monotonically
    //increasing and not periodic.  This can be achieved by invoking activitySteps, and considering a sample of the odd indexed
    //values, which correspond to activities at the moment beamOn transitions to beamOff.
    
    data = {
        "time" : []
    }

    //set up arrays for all beam species of interest
    for(i=0; i<dataStore.beamSpecies.length; i++){
        if(dataStore.beamSpecies[i].enabled){
            data[dataStore.beamSpecies[i].name] = [];
        }
    }

    //decide how many points to sample - shoot for about 1000 maxima spread over the experiment
    nTransitions = Math.floor(dataStore.config.exptDuration*dataStore.config.exptDurationUnit*3600000 / (beamOn + beamOff))*2
    nStep = nTransitions / 2; // == how many maxima
    nStep = Math.max(1, Math.floor(nStep/1000)); //skip this many maxima between points to cover the experiment in about 1000 points.
    nPoints = Math.floor(nTransitions / 2 / nStep);

    for(i=0; i<nPoints; i++){
        //add the x-value to the list:
        time = beamOn + i*nStep*(beamOn + beamOff);
        data.time.push(time / 3600000 / dataStore.config.exptDurationUnit);

        //add a y-value for each isotope:
        for(j=0; j<dataStore.beamSpecies.length; j++){
            if(dataStore.beamSpecies[j].enabled){
                data[dataStore.beamSpecies[j].name].push(   nthMax(i*nStep*2 + 1, 
                                                                dataStore.beamSpecies[j].yield * regionScale(dataStore.config.region), 
                                                                beamOn, 
                                                                beamOff, 
                                                                dataStore.beamSpecies[j].lifetime/1000) 
                                                            + chamberOffset(time, dataStore.beamSpecies[j].lifetime, dataStore.beamSpecies[j].yield)
                                                        );
            }
        }
    }

    return data;
}

function generateFirstThreeCyclesData(){

    var data, time,
        nPoints = 800,
        i, j, 
        beamOn = dataStore.config.beamOn*dataStore.config.beamOnUnit, // in ms
        beamOff = dataStore.config.beamOff*dataStore.config.beamOffUnit; // in ms
    
    data = {
        "time" : []
    }

    //set up arrays for all beam species of interest
    for(i=0; i<dataStore.beamSpecies.length; i++){
        if(dataStore.beamSpecies[i].enabled){
            data[dataStore.beamSpecies[i].name] = [];
        }
    }

    for(i=0; i<nPoints; i++){
        //add the x-value to the list:
        time = (3*(beamOn + beamOff)/nPoints)*i;
        data.time.push(time / dataStore.config.beamOnUnit);

        //add a y-value for each isotope:
        for(j=0; j<dataStore.beamSpecies.length; j++){
            if(dataStore.beamSpecies[j].enabled){
                data[dataStore.beamSpecies[j].name].push(   Activity(
                                                                dataStore.beamSpecies[j].yield, 
                                                                dataStore.beamSpecies[j].lifetime/1000, 
                                                                time, 
                                                                dataStore.config.region
                                                            )
                                                            + chamberOffset(time, dataStore.beamSpecies[j].lifetime, dataStore.beamSpecies[j].yield)
                                                        );
            }
        }
    }

    return data;
}

function generateLastThreeCyclesData(){
    //create the CSV string for the last three cycles 
    //(note this is actually the last 3 cycles worth of time, if the expt duration % cycle time != 0 then there will be a corresponding offset here)

    var data, time,
        nPoints = 800,
        i, j,
        beamOn = dataStore.config.beamOn*dataStore.config.beamOnUnit, // in ms
        beamOff = dataStore.config.beamOff*dataStore.config.beamOffUnit; // in ms
    
    data = {
        "time" : []
    }

    //set up arrays for all beam species of interest
    for(i=0; i<dataStore.beamSpecies.length; i++){
        if(dataStore.beamSpecies[i].enabled){
            data[dataStore.beamSpecies[i].name] = [];
        }
    }

    for(i=0; i<nPoints; i++){
        //add the x-value to the list:
        time = dataStore.config.exptDuration*dataStore.config.exptDurationUnit*3600000 - 3*(beamOn + beamOff) + (3*(beamOn + beamOff)/nPoints)*i;
        data.time.push(time / dataStore.config.beamOnUnit);

        //add a y-value for each isotope:
        for(j=0; j<dataStore.beamSpecies.length; j++){
            if(dataStore.beamSpecies[j].enabled){
                data[dataStore.beamSpecies[j].name].push(   Activity(
                                                                dataStore.beamSpecies[j].yield, 
                                                                dataStore.beamSpecies[j].lifetime/1000, 
                                                                time, 
                                                                dataStore.config.region
                                                            )
                                                            + chamberOffset(time, dataStore.beamSpecies[j].lifetime, dataStore.beamSpecies[j].yield)
                                                        );
            }
        }
    }

    return data;
}

function generateAfterExperimentData(){
    //create the CSV string for the 1000-hour post-experiment decay

    var data, time,
        nPoints = 800,
        i, j;

    data = {
        "time" : []
    }

    //set up arrays for all beam species of interest
    for(i=0; i<dataStore.beamSpecies.length; i++){
        if(dataStore.beamSpecies[i].enabled){
            data[dataStore.beamSpecies[i].name] = [];
        }
    }


    for(i=0; i<nPoints; i++){
        //add the x-value to the list:
        time = (1000 / nPoints)*i*3600000;
        data.time.push((1000 / nPoints)*i);

        //add a y-value for each isotope:
        for(j=0; j<dataStore.beamSpecies.length; j++){
            if(dataStore.beamSpecies[j].enabled){
                data[dataStore.beamSpecies[j].name].push(   Activity(
                                                                dataStore.beamSpecies[j].yield, 
                                                                dataStore.beamSpecies[j].lifetime/1000, 
                                                                dataStore.config.exptDuration*dataStore.config.exptDurationUnit*3600000, 
                                                                dataStore.config.region
                                                            )
                                                            * Math.exp(-dataStore.beamSpecies[j].lifetime * time/1000)
                                                        );
            }
        }
    }

    return data;
}

function nthMax(N, rate, t_on, t_off, lifetime){
    // activity at <N>th beam transition (initial beam on is N=0) for production <rate>, beam on <t_on>[ms], beam off <t_off>[ms], <lifetime>[ms-1]
    var max = rate * (1 - Math.exp(-lifetime*t_on)),
        numerator, denominator;

    numerator = 1 - Math.pow(Math.exp(-lifetime*(t_on+t_off)), (N-1)/2 + 1);
    denominator = 1 - Math.exp(-lifetime*(t_on+t_off));

    return max*numerator/denominator;
}

function chamberOffset(time, lifetime, yield){
    //the chamber sees not only the 1% activity that backscatters into it,
    //but some extra activity from the 89% that is deposited on the tape in the
    //beamspot; this extra term is independent of cycle number though, since
    //the activity that builds up there is reset to 0 when the tape is cycled into the 
    //tape box between beam off -> beam on.  Thus we can just caluclate it as a 
    //simple correction to be tacked on at the end, that doesn't depend on where in the
    //experiment we are.
    //<time>[ms] into experiment, yield s-1, lifetime s-1

    var propTime, tempTerm,
        beamOn = dataStore.config.beamOn*dataStore.config.beamOnUnit,
        beamOff = dataStore.config.beamOff*dataStore.config.beamOffUnit;

    if(dataStore.config.region != 'chamber') return 0;

    propTime = time % (beamOn + beamOff) //time into this cycle
    if (propTime < beamOn) //still in irradiation step:
        tempTerm = stepActivity(0, 0.89*yield, lifetime, propTime/1000);
    else{ //completed irradiation step, now in decay step
        tempTerm = stepActivity(0, 0.89*yield, lifetime, beamOn/1000);
        tempTerm = stepActivity(tempTerm, 0, lifetime, (propTime - beamOn)/1000);
    }

    return tempTerm;
}

function stepActivity(A0, rate, lifetime, time){
    //starting with initial activity <A0>, return Activity after <time>, under beam <rate> for isotope with <lifetime>
    return rate * (1 - Math.exp(-1*lifetime*time)) + A0 * Math.exp(-1*lifetime*time);
}

function Activity(rate, lifetime, time, region){
    // activity [s-1] at <time [ms]>, for an isotope with <lifetime [ms-1]>, and production <rate [s-1]>

    var N, timeSinceLastMax, activityAtLastMax, activity,
        Rate = regionScale(region) * rate,
        beamOn = dataStore.config.beamOn*dataStore.config.beamOnUnit,
        beamOff = dataStore.config.beamOff*dataStore.config.beamOffUnit;

    //if we're in the very first implantation, things are simple: 
    if(time < beamOn){
        return stepActivity(0, Rate, lifetime, time);
    }

    //how many full cycles have completed before <time>?
    N = Math.floor(time / (beamOn + beamOff));
    //how much time has elapsed in the final cycle before <time>?
    timeSinceLastMax = time - N*(beamOn + beamOff);

    if(timeSinceLastMax < beamOn){
        N = 2*N-1;
        timeSinceLastMax += beamOff;
    } else {
        N = 2*N+1;
        timeSinceLastMax -= beamOn;
    }

    activityAtLastMax = nthMax(N, Rate, beamOn, beamOff, lifetime);

    //finish last beam off
    activity = stepActivity(activityAtLastMax, 0, lifetime, Math.min(timeSinceLastMax, beamOff));
    if(timeSinceLastMax < beamOff)
        return activity;

    //finish last beam on
    activity = stepActivity(activity, Rate, lifetime, Math.min(timeSinceLastMax-beamOff, beamOn) );

    return activity;
}

function regionScale(region){
    //return the appropriate scale constant as a function of <region>:
    if(region == 'box') return 0.89;
    else if(region == 'chamber') return 0.01;
    else if(region == 'beam') return 0.1;
}

///////////////////////////
//plotting + reporting
///////////////////////////

function plotActivity(data, timeUnits, divID, title){

    var dim = document.getElementById('peakPlot').offsetWidth,
        layout = {
            xaxis:{
                title: 'time (' + timeUnits + ')'
            },
            yaxis:{
                title: 'Activity',
                rangemode: 'tozero'
            },
            autosize: false,
            width: dim,
            height: dim,
            title: title,
            showlegend: true
        }, 
        keys = Object.keys(data),
        //construct the plotly data object
        points = [], i;

        for(i=0; i<keys.length; i++){
            if (keys[i] == 'time') continue;

            points.push({
                x: data.time,
                y: data[keys[i]],
                type: 'scatter',
                name: keys[i]
            })
        }
    
    Plotly.newPlot(divID, points, layout);    
}

function repaint(){
    //repaint all plots
    var cycleScale;

    if(dataStore.beamSpecies.length == 0) return;

    if(dataStore.config.beamOnUnit == 1)
        cycleScale = 'ms';
    else if(dataStore.config.beamOnUnit == 1000)
        cycleScale = 's';
    else if(dataStore.config.beamOnUnit == 60000)
        cycleScale = 'min';

    plotActivity(generatePeakData(), dataStore.config.exptDurationScale, 'peakPlot', 'Peak Activity Per Cycle');
    plotActivity(generateFirstThreeCyclesData(), cycleScale, 'firstThreeCyclesPlot', 'Activity Over First Three Cycles');
    plotActivity(generateLastThreeCyclesData(), cycleScale, 'lastThreeCyclesPlot', 'Activity Over Last Three Cycles');
    plotActivity(generateAfterExperimentData(), 'h', 'afterPlot', 'Activity After Experiment');
}

function populateSummaryTable(){
    //refresh number in the summary table

    var i, key,
        postChamber, postTape, postTapeLater;

    for(i=0; i<dataStore.beamSpecies.length; i++){
        key = dataStore.beamSpecies[i].rowID;

        document.getElementById(key+'SummaryIsotope').innerHTML = dataStore.beamSpecies[i].name;

        if(!dataStore.beamSpecies[i].enabled){
            document.getElementById(key+'SummaryChamberRes').innerHTML = 'disabled';
            document.getElementById(key+'SummaryTapeRes').innerHTML = 'disabled';
            document.getElementById(key+'SummaryTapeResLater').innerHTML = 'disabled';
            return;
        }

        postChamber = Activity(dataStore.beamSpecies[i].yield, dataStore.beamSpecies[i].lifetime/1000, dataStore.config.exptDuration*dataStore.config.exptDurationUnit*3600000, 'chamber');
        postTape = Activity(dataStore.beamSpecies[i].yield, dataStore.beamSpecies[i].lifetime/1000, dataStore.config.exptDuration*dataStore.config.exptDurationUnit*3600000, 'box');
        postTapeLater = Activity(dataStore.beamSpecies[i].yield, dataStore.beamSpecies[i].lifetime/1000, dataStore.config.exptDuration*dataStore.config.exptDurationUnit*3600000, 'box')*Math.exp(-dataStore.beamSpecies[i].lifetime*12*3600);
        document.getElementById(key+'SummaryChamberRes').innerHTML = printBQ(postChamber) + '<br>' + printCi(postChamber)
        document.getElementById(key+'SummaryTapeRes').innerHTML = printBQ(postTape) + '<br>' + printCi(postTape)
        document.getElementById(key+'SummaryTapeResLater').innerHTML = printBQ(postTapeLater) + '<br>' + printCi(postTapeLater)
    }
}

////////////////
// helpers
////////////////

function getSelected(id){
    //return the current value selected by the select element with id.
    //thx http://stackoverflow.com/questions/1085801/get-selected-value-in-dropdown-list-using-javascript

    var e = document.getElementById(id);
    return e.options[e.selectedIndex].value;
}

function checkedRadio(name){
    //given the name of a radio group, return the checked radio

    var i, radios = document.getElementsByName(name);

    for (i = 0; i < radios.length; i++) {
        if (radios[i].checked) {
            return radios[i];
        }
    }

    return null
}

function printBQ(activity){
    //return an activity in Bq, with a reasonable SI prefix:
    if(activity > 1000000) return (activity/1000000).toFixed(3) + ' MBq'
    else if(activity > 1000) return (activity/1000).toFixed(3) + ' kBq'
    else return (activity).toFixed(3) + ' Bq'
}


function printCi(activity){
    //return an activity in Ci, with a reasonable SI prefix:
    var ci = activity / 3.7e+10;
    if(ci > 1e-3) return (ci*1000).toFixed(3) + ' mCi'
    else if(ci > 1e-6) return (ci*1000000).toFixed(3) + ' uCi'
    else return (ci*1000000000).toFixed(3) + ' nCi'
}