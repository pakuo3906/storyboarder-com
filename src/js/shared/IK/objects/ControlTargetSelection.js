const SGIKHelper = require("./IkObjects/../../SGIkHelper");
// ControlTargetSelection is class used to identify hover of mouse
// on control points in order to start selection
class ControlTargetSelection
{
    constructor(domElement, camera, controlTargets)
    {
        this.ray = new THREE.Raycaster();
        this.rayControl = new THREE.Raycaster();
        this.camera = camera;
        this.domElement = domElement;
      
        this.controlTargets = controlTargets;
        this.meshes = controlTargets.map((controlTarget) => controlTarget.target);
        this.controls = controlTargets.map((controlTarget) => controlTarget.control);
        this.selectedMeshes = {};
        this.isInitialized = false;
    }

    // Intiliazes event is used when object disposed to reenact it again
    initialize()
    {
        if(this.isInitialized) return;
        this.domElement.addEventListener("pointermove", this.onPointerMove, false);
        this.isInitialized = true;
    }
    // #region Events
    onPointerMove = (event) => { this.pointerHover(this.getPointer(event)); }
    //#endregion

    // Executes hover logic
    pointerHover( pointer ) 
    {
        let ray = this.ray;
        let selectedMeshes = this.selectedMeshes;
		ray.setFromCamera( pointer, this.camera );
        let intersectMeshes = false;
        let intersectControlTarget = false;
        let controlTarget = null;
        intersectMeshes = ray.intersectObjects(this.meshes)[ 0 ] || false;
        intersectMeshes = intersectMeshes === false 
        ? intersectMeshes 
        : Object.keys(selectedMeshes).length === 0 
        ? intersectMeshes
        : intersectMeshes = { object: Object.values(selectedMeshes)[0]};
        
        // Checks if pointer intersects control target only when any mesh is selected
        if(Object.keys(selectedMeshes).length !== 0)
        {
            let rotationalGizmoHelpers = this.rotationalGizmoHelpers( Object.values(selectedMeshes)[0].scope.control);
            intersectControlTarget = ray.intersectObjects(rotationalGizmoHelpers)[ 0 ] || false;
            controlTarget = intersectControlTarget !== false ? intersectControlTarget.object.parent.parent : false;
        }
        // Checks if meshes intersected and if they do then select them
        if ( intersectMeshes ) 
        {
            let object = intersectMeshes.object;
            selectedMeshes[object.uuid] = object;
            object.scope.selectControlPoint();
        } 
        else 
        {
            // Checks if any meshes are selected and control target isn't intersected
            if(Object.keys(selectedMeshes).length === 0 || (controlTarget && controlTarget.mode === 'rotate'))
            {
                return;
            }
            // Goes through selectedMesh and deselect them
            for(let keys in selectedMeshes)
            {
                let selectedMesh = selectedMeshes[keys];
                // Checks if selected mesh's control target is currently in used 
                if(selectedMesh.scope.isControlTargetSelected)
                {
                    continue;
                }
                selectedMesh.scope.deselectControlPoint();
                delete selectedMeshes[keys];
            }
        }
    }

    // Identifies pointer of event
    getPointer( event ) 
    {
		let pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;
		let rect = this.domElement.getBoundingClientRect();
		return {
			x: ( pointer.clientX - rect.left ) / rect.width * 2 - 1,
			y: - ( pointer.clientY - rect.top ) / rect.height * 2 + 1,
			button: event.button
		};
    }
    
    // Identifies gizmo elements which should be raycasted
    rotationalGizmoHelpers(o)
    {
        let results = [];
        if(o.children.length !== 0)
        {
          let gizmo = o.children[0];
          let gizmoChildren = gizmo.children;
          for(let i = 0; i < gizmoChildren.length; i++)
          {
            if(gizmoChildren[i].name === "Helper")
            {
                let children = gizmoChildren[i].children;
                for (let i = 0; i < children.length; i++)
                {
                  results.push(children[i]);
                }
            }
          }
        }
        return results;
    }

    // Dispose event
    dispose()
    {
        if(! this.isInitialized) return;
        this.isInitialized = false;
        this.domElement.removeEventListener("pointermove", this.onPointerMove, false);
        let selectedMeshes = this.selectedMeshes;
        for(let keys in selectedMeshes)
        {
            let selectedMesh = selectedMeshes[keys];
            // Checks if selected mesh's control target is currently in used 
            if(selectedMesh.scope.isControlTargetSelected)
            {
                continue;
            }
            selectedMesh.scope.deselectControlPoint();
        }
        this.selectedMeshes = {};
        for(let i = 0; i < this.controls.length; i++)
        {
            this.controls[i].reset();
        }
    }
}

module.exports = ControlTargetSelection;
