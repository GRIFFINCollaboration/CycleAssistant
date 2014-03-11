(function(){  

    xtag.register('x-InputTable', {
        extends: 'table',
        lifecycle: {
            created: function() {
                var i, titleRow, titleCell;

                this.buffer = {
                    'columns' : this.columns.split(','),
                    'types' : this.types.split(','),
                    'values' : this.values.split(','),
                    'minima' : this.minima.split(','),
                    'selectValues' : this.selectValues.split(','),
                    'selectOptions' : this.selectOptions.split(','),
                    'rows' : 0,     //index for creating new rows - increment only
                    'nRows' : 0     //current count of number of rows, increment / decrement as needed
                }

                //add title row
                titleRow = document.createElement('tr');
                titleRow.setAttribute('id', this.id+'TitleRow');
                this.appendChild(titleRow);
                for(i=0; i<this.buffer.columns.length; i++){
                    titleCell = document.createElement('td');
                    titleCell.setAttribute('id', this.id+'TitleCell'+i);
                    titleCell.innerHTML = this.buffer.columns[i];
                    document.getElementById(this.id+'TitleRow').appendChild(titleCell);
                }

                //delete row column:
                titleCell = document.createElement('td');
                titleCell.setAttribute('id', this.id+'TitleCellDelete');
                titleCell.setAttribute('class', 'deleteRow');
                titleCell.innerHTML = 'Delete';
                document.getElementById(this.id+'TitleRow').appendChild(titleCell);

                //add a blank input row
                this.insertRow();


            },
            inserted: function() {},
            removed: function() {},
            attributeChanged: function() {}
        }, 
        events: { 

        },
        accessors: {
            'columns':{
                attribute: {} //this just needs to be declared
            },
            'types':{
                attribute: {}
            },
            'values':{
                attribute: {}
            },
            'minima':{
                attribute: {}
            },
            'selectOptions':{
                attribute: {}
            },
            'selectValues':{
                attribute: {}
            },

            //handle setting the global callback - TODO: per row callbacks?
            'changeCallback':{
                get: function(){
                    if(this.buffer.changeCallback)
                        this.buffer.changeCallback();
                },

                set: function(value){
                    this.buffer.changeCallback = value;
                }
            }
            
        }, 
        methods: {
            'insertRow': function(){
                var newRow = document.createElement('tr'),
                    newCell, newInput, newOption, newLabel, deleteButton, i, j;

                //make a new row
                newRow.setAttribute('id', this.id+'InputRow'+this.buffer.rows);
                this.appendChild(newRow);

                //insert the appropriate cell for each row
                for(i=0; i<this.buffer.types.length; i++){
                    newCell = document.createElement('td');
                    newCell.setAttribute('id', this.id+'Row'+this.buffer.rows+'Cell'+i);
                    document.getElementById(this.id+'InputRow'+this.buffer.rows).appendChild(newCell);

                    //selects handled a bit differently than inputs:
                    if(this.buffer.types[i] == 'select'){
                        newInput = document.createElement('select');
                    } else{
                        newInput = document.createElement('input');
                    }
                    newInput.setAttribute('id', this.id+'Row'+this.buffer.rows+'Cell'+i+this.buffer.types[i]);
                    newInput.setAttribute('type', this.buffer.types[i]);
                    newInput.setAttribute('value', this.buffer.values[i]);
                    newInput.setAttribute('min', this.buffer.minima[i]);
                    newInput.onchange = function(){
                        this.parentNode.parentNode.parentNode.changeCallback;
                    }
                    document.getElementById(this.id+'Row'+this.buffer.rows+'Cell'+i).appendChild(newInput);               
                    //checkboxes are special - default them on and put a label for doing styles:
                    if(this.buffer.types[i] == 'checkbox'){
                        newInput.setAttribute('checked', true);
                        newLabel = document.createElement('label');
                        newLabel.setAttribute('id', this.id+'Row'+this.buffer.rows+'Cell'+i+'label');
                        newLabel.setAttribute('for', this.id+'Row'+this.buffer.rows+'Cell'+i+this.buffer.types[i]);
                        document.getElementById(this.id+'Row'+this.buffer.rows+'Cell'+i).appendChild(newLabel);    
                    }
                    //selects need options stuck in, scraped from selectOptions and selectValues
                    if(this.buffer.types[i] == 'select'){

                        for(j=0; j<this.buffer.selectOptions.length; j++){
                            newOption = document.createElement('option');
                            newOption.setAttribute('id', this.id+'Row'+this.buffer.rows+'Cell'+i+'Option'+j);
                            newOption.setAttribute('value', parseFloat(this.buffer.selectValues[j],10));
                            newInput.appendChild(newOption);
                            document.getElementById(this.id+'Row'+this.buffer.rows+'Cell'+i+'Option'+j).innerHTML = this.buffer.selectOptions[j];
                        }
                    }
                }

                //last element is a delete button to remove this row
                newCell = document.createElement('td');
                newCell.setAttribute('id', this.id+'Row'+this.buffer.rows+'Delete');
                newCell.setAttribute('class', 'deleteRow');
                document.getElementById(this.id+'InputRow'+this.buffer.rows).appendChild(newCell);
                deleteButton = document.createElement('button');
                deleteButton.setAttribute('class', 'deleteRow')
                deleteButton.onclick = this.deleteRow.bind(this, this.buffer.rows);
                document.getElementById(this.id+'Row'+this.buffer.rows+'Delete').appendChild(deleteButton);
                document.getElementById(this.id+'Row'+this.buffer.rows+'Delete').childNodes[0].innerHTML = String.fromCharCode(0x2573);

                //increment row counters
                this.buffer.rows += 1;
                this.buffer.nRows += 1;
            },

            'deleteRow': function(index){
                var element = document.getElementById(this.id+'InputRow'+index);
                element.parentNode.removeChild(element);

                //spawn a new empty row if there are none left:
                this.buffer.nRows -= 1;
                if(this.buffer.nRows == 0)
                    this.insertRow();

                //callback update:
                if(this.buffer.changeCallback)
                    this.buffer.changeCallback();

            }
        }
    });

})();