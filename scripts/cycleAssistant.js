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
        i, index, properties;

    dataStore.beamSpecies = [];

    for(i=1; i<isotopes.length; i++){
        index = isotopes[i].id.slice(0,-3)

        dataStore.beamSpecies.push({
            "name": document.getElementById(index + 'name').value,
            "halfLife": parseFloat(document.getElementById(index + 'halfLife').value),
            "halfLifeUnit": parseInt(getSelected(index + 'halfLifeUnit'), 10),
            "yield": parseFloat(document.getElementById(index + 'yield').value),
            "enabled": document.getElementById(index + 'enabled').checked
        })
    }

    repaint();
}

function parseConfigTable(){
    //parse the config table into dataStore.config

    var exptDurationScale;

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

    return [[0,1,2,3], [100,101,102,103]]
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

////////////////
//plotting
////////////////

function plotWaveform(points, timeUnits, divID, title){
    //plot the reported waveform, described by array of values <wvfrm>.

    var dim = document.getElementById('peakPlot').offsetWidth;
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
            title: title
        }

    //construct the plotly data object
    data = [
        {
            x: points[0],
            y: points[1],
            type: 'scatter'
        }
    ]
    
    Plotly.newPlot(divID, data, layout);    
}

function repaint(){
    //repaint all plots

    plotWaveform(generatePeakData(), dataStore.config.exptDurationScale, 'peakPlot', 'Peak Activity During Experiment');
    plotWaveform(generateFirstThreeCyclesData(), dataStore.config.exptDurationScale, 'firstThreeCyclesPlot', 'Activity Over First Three Cycles');
    plotWaveform(generateLastThreeCyclesData(), dataStore.config.exptDurationScale, 'lastThreeCyclesPlot', 'Activity Over Last Three Cycles');
    plotWaveform(generateAfterExperimentData(), dataStore.config.exptDurationScale, 'afterPlot', 'Activity After Experiment');
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