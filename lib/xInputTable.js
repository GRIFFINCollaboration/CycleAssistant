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
                    'rows' : 0
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
                    newCell, newInput, newLabel, i;

                //make a new row
                newRow.setAttribute('id', this.id+'InputRow'+this.buffer.rows);
                this.appendChild(newRow);

                //insert the appropriate cell for each row
                for(i=0; i<this.buffer.types.length; i++){
                    newCell = document.createElement('td');
                    newCell.setAttribute('id', this.id+'Row'+this.buffer.rows+'Cell'+i);
                    document.getElementById(this.id+'InputRow'+this.buffer.rows).appendChild(newCell);

                    newInput = document.createElement('input');
                    newInput.setAttribute('id', this.id+'Row'+this.buffer.rows+'Cell'+i+this.buffer.types[i]);
                    newInput.setAttribute('type', this.buffer.types[i]);
                    newInput.setAttribute('value', this.buffer.values[i]);
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
                }
                //increment row counter
                this.buffer.rows += 1;
            }
        }
    });

})();