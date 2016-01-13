///////////////////////
// dom manipulation
///////////////////////

function addBeamIsotope(){
    //insert the html for a new row in the beam isotope table

    document.getElementById('beamCocktailTable').innerHTML += Mustache.to_html(
        document.getElementById('cocktailRow').innerHTML, 
        {
            'id': dataStore.isotopeIndex
        }
    );

    dataStore.isotopeIndex += 1;
    repopulateBeamList()
}

function removeBeamIsotope(targetRowID){
    //remove a beam isotope row 

    var node = document.getElementById(targetRowID);
    node.parentNode.removeChild(node);

    parseBeamList()
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
            "enabled": document.getElementById(index + 'enabled').checked
        })
    }

    repaint();
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
        key, i, j, nTransitions,
        foundAnIsotope = false,
        propTime, 
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
                                                                dataStore.beamSpecies[j].yield, 
                                                                beamOn, 
                                                                beamOff, 
                                                                dataStore.beamSpecies[j].lifetime/1000) 
                                                            + chamberOffset(time, key)
                                                        );
            }
        }
    }

    return data;
}

function generateFirstThreeCyclesData(){

    return [[0,1,2,3], [100,101,102,103]]
}

function generateLastThreeCyclesData(){

    return [[0,1,2,3], [100,101,102,103]]
}

function generateAfterExperimentData(){

    return [[0,1,2,3], [100,101,102,103]]
}

function nthMax(N, rate, t_on, t_off, lifetime){
    // activity at <N>th beam transition (initial beam on is N=0) for production <rate>, beam on <t_on>[ms], beam off <t_off>[ms], <lifetime>[ms-1]
    var max = rate * (1 - Math.exp(-lifetime*t_on)),
        numerator, denominator;

    numerator = 1 - Math.pow(Math.exp(-lifetime*(t_on+t_off)), (N-1)/2 + 1);
    denominator = 1 - Math.exp(-lifetime*(t_on+t_off));

    return max*numerator/denominator;
}

function chamberOffset(time, index){
    //the chamber sees not only the 1% activity that backscatters into it,
    //but some extra activity from the 89% that is deposited on the tape in the
    //beamspot; this extra term is independent of cycle number though, since
    //the activity that builds up there is reset to 0 when the tape is cycled into the 
    //tape box between beam off -> beam on.  Thus we can just caluclate it as a 
    //simple correction to be tacked on at the end, that doesn't depend on where in the
    //experiment we are.
    //<time>[ms] into experiment, <index> from dataStore.beamSpecies indicating which isotope we're doing this for

    var propTime, tempTerm,
        beamOn = dataStore.config.beamOn*dataStore.config.beamOnUnit,
        beamOff = dataStore.config.beamOff*dataStore.config.beamOffUnit;

    if(dataStore.config.region != 'chamber') return 0;

    propTime = time % (beamOn + beamOff) //time into this cycle
    if (propTime < beamOn) //still in irradiation step:
        tempTerm = stepActivity(0, 0.89*dataStore.beamSpecies[i].yield, dataStore.beamSpecies[i].lifetime, propTime/1000);
    else{ //completed irradiation step, now in decay step
        tempTerm = stepActivity(0, 0.89*dataStore.beamSpecies[i].yield, dataStore.beamSpecies[i].lifetime, beamOn/1000);
        tempTerm = stepActivity(tempTerm, 0, dataStore.beamSpecies[i].lifetime, (propTime - beamOn)/1000);
    }

    return tempTerm;
}

function stepActivity(A0, rate, lifetime, time){
    //starting with initial activity <A0>, return Activity after <time>, under beam <rate> for isotope with <lifetime>
    return rate * (1 - Math.exp(-1*lifetime*time)) + A0 * Math.exp(-1*lifetime*time);
}

////////////////
//plotting
////////////////

function plotActivity(data, timeUnits, divID, title){

    var dim = document.getElementById('peakPlot').offsetWidth,
        layout = {
            xaxis:{
                title: 'time (' + timeUnits + ')'
            },
            yaxis:{
                title: 'Activity',
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

    if(dataStore.beamSpecies.length == 0) return;

    plotActivity(generatePeakData(), dataStore.config.exptDurationScale, 'peakPlot', 'Peak Activity During Experiment');
    //plotWaveform(generateFirstThreeCyclesData(), dataStore.config.exptDurationScale, 'firstThreeCyclesPlot', 'Activity Over First Three Cycles');
    //plotWaveform(generateLastThreeCyclesData(), dataStore.config.exptDurationScale, 'lastThreeCyclesPlot', 'Activity Over Last Three Cycles');
    //plotWaveform(generateAfterExperimentData(), dataStore.config.exptDurationScale, 'afterPlot', 'Activity After Experiment');
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