(function(){  

    xtag.register('x-StateFlag', {
        extends: 'div',
        lifecycle: {
            created: function() {
                var i, stateDiv;

                this.buffer = {
                    'state' : 0 //start life in the first state
                }

                //one div for each state
                for(i=0; i<this.nStates; i++){
                    stateDiv = document.createElement('div');
                    stateDiv.setAttribute('id', this.id + 'State' + i);
                    stateDiv.setAttribute('class', 'unselectedStateDiv');
                    stateDiv.setAttribute('style', 'display:inline-block');
                    stateDiv.onclick = function(index){
                        this.goto(index);
                    }.bind(this, i);
                    this.appendChild(stateDiv);
                }

                //start first div as active class
                document.getElementById(this.id + 'State0').setAttribute('class', 'selectedStateDiv')
                
            },
            inserted: function() {},
            removed: function() {},
            attributeChanged: function() {}
        }, 
        events: { 

        },
        accessors: {
            'nStates':{
                attribute: {} //this just needs to be declared
            },

            //callback for goto function
            'gotoCallback':{
                get: function(){
                    if(this.buffer.gotoCallback)
                        this.buffer.gotoCallback();
                },

                set: function(value){
                    this.buffer.gotoCallback = value;
                }
            },

            'state':{
                get: function(){
                    return this.buffer.state;
                },

                set: function(){
                    return //do nothing, use goto if you want to set this.
                }
            }
        }, 
        methods: {
            'nextState': function(){
                document.getElementById(this.id + 'State' + this.buffer.state).setAttribute('class', 'unselectedStateDiv');
                this.buffer.state = (this.buffer.state + 1) % parseInt(this.nStates, 10);
                document.getElementById(this.id + 'State' + this.buffer.state).setAttribute('class', 'selectedStateDiv');
            },

            'previousState': function(){
                document.getElementById(this.id + 'State' + this.buffer.state).setAttribute('class', 'unselectedStateDiv');
                this.buffer.state -= 1;
                if(this.buffer.state < 0) this.buffer.state += parseInt(this.nStates, 10);
                document.getElementById(this.id + 'State' + this.buffer.state).setAttribute('class', 'selectedStateDiv');
            },

            'goto': function(index){
                document.getElementById(this.id + 'State' + this.buffer.state).setAttribute('class', 'unselectedStateDiv');
                this.buffer.state = index % this.nStates;
                document.getElementById(this.id + 'State' + this.buffer.state).setAttribute('class', 'selectedStateDiv');
                if(this.buffer.gotoCallback)
                    this.buffer.gotoCallback()
            }
        }
    });

})();