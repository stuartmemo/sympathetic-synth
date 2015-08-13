/************************************
 * Sympathetic Synthesizer System Mk1
 * synth.js
 * Copyright 2013 Stuart Memo
 ***********************************/

(function (window, undefined) {

    /*
     * High-level Guide
     * ================
     * To create synth:
     *     var synth = new Synth();
     * And to play:
     *     synth.playNote('C3');
     * And to stop it:
     *     synth.stopNote('C3');
     */

    var Synth = (function (settings) {

        /*
         * Creates an instance of the synth.
         *
         * @constructor
         * @this {Synth}
         */

        var Synth = function (settings) {
            this.version = '0.0.1';
            init.call(this, settings);
        };

        var mergeObjects = function (obj1, obj2) {
            for (var attr in obj2) {
                obj1[attr] = obj2[attr];
            }
        }

        /*
         * Initialise the synth.
         *
         * @method init
         */
        var init = function (settings) {
            this.activeOscillators = [];
            this.activeVolumeEnvelopes = [];
            this.activeFilterEnvelopes = [];
            this.keysDown = [];
            this.allNodes = [],
            this.speakersOn = false;
            this.volume = 1;
            that = this;

            this.output = tsw.gain();

            // Settings for the 3 oscillators.
            this.oscillators = {
                osc1: {
                    range: 8,
                    waveform: 'square',
                    detune: 0
                },
                osc2: {
                    range: 4,
                    waveform: 'sawtooth',
                    detune: 0
                },
                osc3: {
                    range: 16,
                    waveform: 'square',
                    detune: 0
                }
            };

            if (typeof settings === 'object') {
                mergeObjects(this, settings);
            }

            // Mixer settings.
            // Nodes are created here too as they don't need to be destroyed.
            this.mixer = {
                osc1: {
                    node: tsw.gain(),
                    volume: 0.5,
                    active: true
                },
                osc2: {
                    node: tsw.gain(),
                    volume: 0.5,
                    active: true
                },
                osc3: {
                    node: tsw.gain(),
                    volume: 0.5,
                    active: true
                }
            };

            // Filter Envelope Settings
            this.filterEnvelopeSettings = {
                name: 'Filter Envelope',
                attack: 0.1,
                decay: 0.5,
                sustain: 5000,
                Q: 5,
                release: 1,
                maxLevel: 10000,
                autoStop: false
            };

            // Volume Envelope settings.
            this.volumeEnvelopeSettings = {
                name: 'Volume Envelope',
                attack: 1.0,
                decay: 0.5,
                sustain: 0.4,
                release: 0,
                startLevel: 0
            };

            // Output settings.
            this.gainForLFOSettings= {
                volume: 0.5,
                node: tsw.gain()
            };

            // LFO settings.
            this.lfoSettings = {
                frequency: 0,
                depth: 5,
                waveType: 'triangle',
                target: that.gainForLFOSettings.node.gain,
                autoStart: true,
                node: null
            };

            var limiterSettings = {
                threshold: -50,
                release: 0.1
            };

            var limiter = tsw.compressor(limiterSettings);

            this.masterVolume = tsw.gain(this.volume);
            // this.lfoSettings.node = tsw.lfo(this.lfoSettings);

            // Noise
            var noise = tsw.noise();
            this.noiseGate = tsw.gain();
            this.noiseLevel = tsw.gain();
            this.noiseFrequency = tsw.filter('bandpass');
            this.noiseGate.gain.value = 0;

            // Start garbage collector for nodes no longer needed.
            this.garbageCollection(this);

            // Connect mixer to output.
            tsw.connect([this.mixer.osc1.node, this.mixer.osc2.node, this.mixer.osc3.node],
//                        this.gainForLFOSettings.node,
                        this.masterVolume);

            if (this.speakersOn) {
                tsw.connect(this.masterVolume, tsw.speakers);
            } else {
                tsw.connect(this.masterVolume, this.output)
            }

            //tsw.connect(noise, this.noiseFrequency, this.noiseLevel, this.noiseGate, this.gainForLFOSettings.node);
        };

        var rangeToFrequency = function (baseFrequency, range) {
            var frequency = baseFrequency;

            switch (range) {
                case '2':
                    frequency = baseFrequency * 4;
                    break;
                case '4':
                    frequency = baseFrequency * 2;
                    break;
                case '16':
                    frequency = baseFrequency / 2;
                    break;
                case '32':
                    frequency = baseFrequency / 4;
                    break;
                case '64':
                    frequency = baseFrequency / 8;
                    break;
                default:
                    break;
            }

             return frequency;
        };

        /*
         * Create the oscillators that generate basic sounds.
         *
         * @method oscillators
         */
        var createOscillators = function (frequency) {
            var noteOscillators = [];

            for (var i = 1; i < 4; i++) {
                var oscillator = tsw.oscillator(null, this.oscillators['osc' + i].waveform),
                    range = this.oscillators['osc' + i].range,
                    detune = this.oscillators['osc' + i].detune;

                oscillator.frequency(rangeToFrequency(frequency, range));
                oscillator.detune(detune);
                noteOscillators.push(oscillator);
            }

            return noteOscillators;
        };

        /*
         * Play given note on synth.
         *
         * @method playNote
         * @param {note} string Musical note to play
         * @param {startTime} number Context time to play note (in seconds)
         *
         * @param {endTime} number Context time to end note (in seconds)
         */
        Synth.prototype.playNote = function (note) {
            var timeToStart = tsw.now();

            if (typeof note === 'object') {
                timeToStart= note.startTime;
                note = note.note;
            }

            var noteOscillators = createOscillators.call(this, tsw.frequency(note)),
                that = this;

            that.noiseFrequency.frequency = tsw.frequency(note);
            this.keysDown.push(note);
            that.noiseGate.gain.value = 1;

			function drawGraph (vol) {
				var graph = document.getElementById('volume-graph'),
				graphHeight = graph.height, // haha graphite.
				graphWidth = graph.width,
				ctx = graph.getContext('2d'),
				i = 0,
				interval = 100,
				totalTimeToGraph = 50,
				maxGain = 1;

				ctx.moveTo(0, graphHeight); // start graph at bottom left.

				var interval = setInterval(function () {
					var x = (graph.width / totalTimeToGraph) * i,
					y = graph.height - (graph.height * vol.params.gain.value);

					ctx.lineTo(x, y);
					ctx.stroke();
					i++;
				}, 100);
			};

            noteOscillators.forEach(function (oscillator, index) {
                var gainForEnvelope = tsw.gain(),
                    filter = tsw.filter('lowpass'),
                    volEnvelope,
                    filterEnvelope;

                index++;

                that.volumeEnvelopeSettings.param = gainForEnvelope.params.gain;
                that.filterEnvelopeSettings.param = filter.frequency;

                volEnvelope = tsw.envelope(that.volumeEnvelopeSettings);
                filterEnvelope = tsw.envelope(that.filterEnvelopeSettings);

                // tsw.connect(oscillator, gainForEnvelope, filter, that.mixer['osc' + index].node);
                tsw.connect(oscillator, gainForEnvelope, that.mixer['osc' + index].node);

                drawGraph(gainForEnvelope);

                oscillator.start(timeToStart);
                volEnvelope.start(timeToStart);
                filterEnvelope.start(timeToStart);

                that.activeOscillators.push(oscillator);
                that.activeVolumeEnvelopes.push(volEnvelope);
                that.activeFilterEnvelopes.push(filterEnvelope);

                that.allNodes.push(oscillator);
            });
        };

        /*
         * Stop given note from playing.
         *
         * @method stopNote
         * @param {note} string Musical note to stop playing.
         */
        Synth.prototype.stopNote = function (note) {
            var timeToStop = tsw.now(),
                frequency,
                match = false;

            if (typeof note === 'object') {
                timeToStop = note.stopTime;
                note = note.note;
            }

            frequency = tsw.frequency(note);

            for (var i = 0; i < this.activeOscillators.length; i++) {
                for (oscillator in this.oscillators) {
                    var oscType = this.activeOscillators[i].type();

                    if (this.oscillators[oscillator].waveform === oscType) {

                        if (Math.floor(rangeToFrequency(frequency, this.oscillators[oscillator].range)) === Math.floor(this.activeOscillators[i].frequency())) {
                            match = true;
                        }
                    }
                }

                if (match) {
                    this.activeOscillators[i].stop(timeToStop + this.volumeEnvelopeSettings.release);

                    this.activeOscillators.splice(i, 1);

                    this.activeVolumeEnvelopes[i].release(timeToStop);
                    this.activeVolumeEnvelopes.splice(i, 1);

                    this.activeFilterEnvelopes[i].release(timeToStop);
                    this.activeFilterEnvelopes.splice(i, 1);
                    i--;
                }

                that.noiseGate.gain.value = 0;

                match = false;
            }
        };


        /*
         * Disconnect oscillators no longer in use.
         *
         * @method garbageCollection
         * @param {synth} Current instance of the synth
         */
        Synth.prototype.garbageCollection = function (synth) {

            // Remove the ghosts of dead oscillators
            for (var i = 0; i < synth.allNodes.length; i++) {
                if (synth.allNodes[i].playbackState === 3) {
                    synth.allNodes[i].disconnect();
                }
                synth.allNodes.splice(i, 1);
                i--;

            }

            setTimeout(function () { synth.garbageCollection(synth) }, 1000);
        };

        return Synth;
    })();

    window.Synth = Synth;

})(window);
