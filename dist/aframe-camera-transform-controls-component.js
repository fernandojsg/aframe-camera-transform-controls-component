/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

	/* global AFRAME */

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before AFRAME was available.');
	}

	AFRAME.registerComponent('hint-scale', {
	  schema: {
	    rightEl: {type: 'selector'},
	    leftEl: {type: 'selector'},
	    text: {default: '1.0x'}
	  },

	  init: function () {
	    var el = this.el;
	    this.rightEl = this.leftEl = null;
	    var middle = this.middle = document.createElement('a-sphere');
	    var text = this.text = document.createElement('a-entity');
	    var line = this.line = document.createElement('a-entity');

	    this.cameraObject = this.el.parentElement.querySelector('[camera]').object3D;

	    el.appendChild(middle);
	    el.appendChild(text);
	    el.appendChild(line);
	    
	    this.rightEl = document.getElementById('righthand');
	    this.leftEl = document.getElementById('lefthand');

	    middle.setAttribute('radius', '0.003');
	    middle.setAttribute('color', '#000');

	    line.setAttribute('line', {color: 'black'});
	    text.setAttribute('text', {color: 'black', align: 'center', value: '1.0x', width: 0.5});
	  },

	  update: function (oldData) {
	    if (oldData.text !== this.data.text) {
	      this.text.setAttribute('text', {value: this.data.text});
	    }
	  },

	  tick: (function () {
	    return function () {

	      var linePosL = new THREE.Vector3();
	      var linePosR = new THREE.Vector3();
	      var mid = new THREE.Vector3();

	      if (this.el.getAttribute('visible') === true) {

	        var posL = this.leftEl.getAttribute('position');
	        var posR = this.rightEl.getAttribute('position');
	    
	        mid.subVectors(posL, posR).multiplyScalar(0.5).add(posR);
	        this.middle.setAttribute('position', mid);
	        
	        mid.y += 0.025;
	        this.text.setAttribute('position', mid);
	        this.text.object3D.lookAt(this.cameraObject.position);
	  
	        linePosR.copy(posR);
	        linePosL.copy(posL);
	  
	        this.line.setAttribute('line', {start: linePosL, end: linePosR}); 
	      }
	    }
	  })()
	});

	/**
	 * Camera Transform Controls component for A-Frame.
	 */
	var UP = new THREE.Vector3(0, 1, 0);
	AFRAME.registerComponent('camera-transform-controls', {
	  schema: {
	    enabled: {default: true},
	    cameraRigId: {default: 'cameraRig'},
	    onStart: {default: 'triggerdown'},
	    onEnd: {default: 'triggerup'},
	    showHint: {default: true}
	  },

	  init: function () {
	    this.cameraRigEl = document.getElementById(this.data.cameraRigId);

	    var hintEl = this.hintEl = document.createElement('a-entity');
	    hintEl.setAttribute('hint-scale', '');
	    hintEl.setAttribute('visible', false);
	    this.cameraRigEl.appendChild(hintEl);
	    
	    this.currentDragCenter = new THREE.Vector3();
	    this.panningController = null;

	    this.controllers = {
	      left: {
	        entity: null,
	        dragging: false,
	        dragStartPoint: new THREE.Vector3()
	      },
	      right: {
	        entity: null,
	        dragging: false,
	        dragStartPoint: new THREE.Vector3()
	      }
	    };

	    this.originalPosition = new THREE.Vector3();
	    this.originalScale = new THREE.Vector3();
	    this.originalRotation = new THREE.Vector3();

	    this.isLeftButtonDown = false;
	    this.isRightButtonDown = false;

	    this.cameraScaleEventDetail = {cameraScaleFactor: 1};
	  },

	  /**
	   * Reset original camera rig transforms if disabling camera scaler.
	   */
	  update: function (oldData) {
	    var cameraRigEl = this.cameraRigEl;

	    if (!cameraRigEl) {return;}

	    // Enabling. Store original transformations.
	    if (!oldData.enabled && this.data.enabled) {
	      this.originalPosition.copy(cameraRigEl.object3D.position);
	      this.originalScale.copy(cameraRigEl.object3D.scale);
	      this.originalRotation.copy(cameraRigEl.object3D.rotation);
	    }

	    // Disabling, reset to original transformations.
	    if (oldData.enabled && !this.data.enabled) {
	      cameraRigEl.setAttribute('position', this.originalPosition);
	      cameraRigEl.setAttribute('scale', this.originalScale);
	      cameraRigEl.setAttribute('rotation', this.originalRotation.clone());
	    }
	  },

	  tick: function () {
	    this.hintEl.setAttribute('visible', false);

	    if (!this.data.enabled) { return; }

	    if (!this.isLeftButtonDown && !this.isRightButtonDown) { return; }

	    if (this.isLeftButtonDown && this.isRightButtonDown) {
	      this.twoHandInteraction();
	      this.hintEl.setAttribute('visible', this.data.showHint);
	    } else {
	      this.processPanning();
	    }
	  },

	  onButtonDown: function (evt) {
	    var left;
	    var target;

	    if (!this.cameraRigEl.object3D) { return; }

	    target = evt.target;
	    left = target === this.leftHandEl;

	    if (left) {
	      this.isLeftButtonDown = true;
	      this.panningController = this.controllers.left;
	    } else {
	      this.isRightButtonDown = true;
	      this.panningController = this.controllers.right;
	    }

	    this.panningController.entity.object3D.getWorldPosition(
	      this.panningController.dragStartPoint);

	    this.released = this.isLeftButtonDown && this.isRightButtonDown;
	  },

	  onButtonUp: function (evt) {
	    var left;
	    var target;

	    target = evt.target;
	    left = evt.target === this.leftHandEl;

	    if (left) {
	      this.panningController = this.controllers.right;
	      this.isLeftButtonDown = false;
	    } else {
	      this.panningController = this.controllers.left;
	      this.isRightButtonDown = false;
	    }

	    this.panningController.entity.object3D.getWorldPosition(
	      this.panningController.dragStartPoint);

	    if (!this.isLeftButtonDown && !this.isRightButtonDown) {
	      this.cameraScaleEventDetail.cameraScaleFactor = this.cameraRigEl.object3D.scale.x;
	      this.el.emit('camerascale', this.cameraScaleEventDetail);
	    }

	    this.released = true;
	  },

	  /**
	   * With two hands, translate/rotate/zoom.
	   */
	  twoHandInteraction: (function () {
	    var centerVec3 = new THREE.Vector3();
	    var currentDistanceVec3 = new THREE.Vector3();
	    var currentPositionLeft = new THREE.Vector3();
	    var currentPositionRight = new THREE.Vector3();
	    var midPoint = new THREE.Vector3();
	    var prevDistanceVec3 = new THREE.Vector3();

	    return function () {
	      var currentAngle;
	      var currentDistance;
	      var deltaAngle;
	      var deltaDistance;
	      var translation;

	      this.leftHandEl.object3D.getWorldPosition(currentPositionLeft);
	      this.rightHandEl.object3D.getWorldPosition(currentPositionRight);

	      if (this.released) {
	        this.prevAngle = signedAngleTo(currentPositionLeft, currentPositionRight);
	        this.initAngle = this.prevAngle = Math.atan2(
	          currentPositionLeft.x - currentPositionRight.x,
	          currentPositionLeft.z - currentPositionRight.z);
	        midPoint.copy(currentPositionLeft)
	          .add(currentPositionRight)
	          .multiplyScalar(0.5);
	        this.prevDistance = prevDistanceVec3.copy(currentPositionLeft)
	          .sub(currentPositionRight)
	          .length();
	        this.released = false;
	      }

	      currentDistance = currentDistanceVec3.copy(currentPositionLeft)
	        .sub(currentPositionRight)
	        .length();
	      deltaDistance = this.prevDistance - currentDistance;

	      //Get center point using local positions.
	      centerVec3.copy(this.leftHandEl.object3D.position)
	        .add(this.rightHandEl.object3D.position)
	        .multiplyScalar(0.5);

	      // Set camera rig scale.
	      this.cameraRigEl.object3D.scale.addScalar(deltaDistance);
	      this.cameraRigEl.setAttribute('scale', this.cameraRigEl.object3D.scale);
	      this.hintEl.setAttribute('hint-scale', {text: this.cameraRigEl.object3D.scale.x.toFixed(2) + 'x'});

	      // Set camera rig position.
	      translation = centerVec3
	        .applyQuaternion(this.cameraRigEl.object3D.quaternion)
	        .multiplyScalar(deltaDistance);
	      this.cameraRigEl.object3D.position.sub(translation);
	      this.cameraRigEl.setAttribute('position', this.cameraRigEl.object3D.position);

	      // Set camera rig rotation.
	      currentAngle = Math.atan2(currentPositionLeft.x - currentPositionRight.x,
	                                currentPositionLeft.z - currentPositionRight.z);
	      deltaAngle = currentAngle - this.prevAngle;
	      this.rotateScene(midPoint, deltaAngle);

	      this.prevAngle = currentAngle - deltaAngle;
	    }
	  })(),

	  rotateScene: (function () {
	    var dirVec3 = new THREE.Vector3();

	    return function (midPoint, deltaAngle) {
	      var cameraRigEl = this.cameraRigEl;
	      var rotation;

	      // Rotate the direction.
	      dirVec3.copy(cameraRigEl.object3D.position)
	        .sub(midPoint)
	        .applyAxisAngle(UP, -deltaAngle);

	      cameraRigEl.object3D.position.copy(midPoint).add(dirVec3);
	      cameraRigEl.setAttribute('position', cameraRigEl.object3D.position);

	      rotation = cameraRigEl.getAttribute('rotation');
	      rotation.y -= deltaAngle * THREE.Math.RAD2DEG;
	      cameraRigEl.setAttribute('rotation', rotation);
	    };
	  })(),

	  /**
	   * One hand panning.
	   */
	  processPanning: (function () {
	    var currentPosition = new THREE.Vector3();
	    var deltaPosition = new THREE.Vector3();

	    return function () {
	      var dragStartPoint = this.panningController.dragStartPoint;
	      this.panningController.entity.object3D.getWorldPosition(currentPosition);
	      deltaPosition.copy(dragStartPoint).sub(currentPosition);

	      // Apply panning.
	      this.cameraRigEl.object3D.position.add(deltaPosition);
	      this.cameraRigEl.setAttribute('position', this.cameraRigEl.object3D.position);
	    };
	  })(),

	  registerHand: function (entity, hand) {
	    this.controllers[hand].entity = entity;
	    entity.addEventListener(this.data.onStart, this.onButtonDown.bind(this));
	    entity.addEventListener(this.data.onEnd, this.onButtonUp.bind(this));

	    if (hand === 'left') {
	      this.leftHandEl = entity;
	    } else {
	      this.rightHandEl = entity;
	    }
	  }
	});

	AFRAME.registerComponent('camera-transform-controls-hand', {
	  schema: {
	    hand: {default: 'right'}
	  },

	  play: function () {
	    this.el.sceneEl.components['camera-transform-controls'].registerHand(this.el, this.data.hand);
	  }
	});

	function signedAngleTo (fromVec3, toVec3) {
	  var angle;
	  var cross;
	  angle = fromVec3.angleTo(toVec3);
	  cross = fromVec3.clone().cross(toVec3);
	  if (UP.dot(cross) < 0) {  // Or > 0.
	    angle = -angle;
	  }
	  return angle;
	}

/***/ })
/******/ ]);