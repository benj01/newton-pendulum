// checkammo.js - Utility to check Ammo.js capabilities

export function checkAmmoSoftBodySupport() {
    console.log("Checking Ammo.js soft body support...");
    
    // Make sure Ammo is available
    if (typeof Ammo === 'undefined') {
      console.error("Ammo.js is not loaded");
      return {
        available: false,
        error: "Ammo.js is not loaded"
      };
    }
    
    // Initialize Ammo if it's a function
    const checkAmmo = async () => {
      let physics;
      
      try {
        if (typeof Ammo === 'function') {
          physics = await Ammo();
          console.log("Ammo.js initialized from function");
          
          // Log version and build information
          console.log("Ammo.js details:", {
            version: physics.AMMO_VERSION || "Unknown",
            hasHelpers: typeof physics.btSoftBodyHelpers === 'function',
            hasWorldInfo: typeof physics.btSoftBodyWorldInfo === 'function',
            hasSoftRigidDynamics: typeof physics.btSoftRigidDynamicsWorld === 'function',
            buildType: physics.buildType || "Unknown",
            availableMethods: Object.getOwnPropertyNames(physics).filter(name => 
              name.startsWith('bt') || name.includes('Soft')
            ).slice(0, 10) // Only show first 10 methods to avoid console spam
          });
        } else {
          physics = Ammo;
          console.log("Ammo.js already initialized");
        }
        
        // Check for soft body classes
        const checks = [
          { name: "btSoftBodyHelpers", available: typeof physics.btSoftBodyHelpers === 'function' },
          { name: "btSoftBodyWorldInfo", available: typeof physics.btSoftBodyWorldInfo === 'function' },
          { name: "btSoftBodyRigidBodyCollisionConfiguration", available: typeof physics.btSoftBodyRigidBodyCollisionConfiguration === 'function' },
          { name: "btSoftRigidDynamicsWorld", available: typeof physics.btSoftRigidDynamicsWorld === 'function' }
        ];
        
        console.table(checks);
        
        // Check if all required classes are available
        const allAvailable = checks.every(check => check.available);
        
        // Try to create basic soft body objects
        if (allAvailable) {
          try {
            const worldInfo = new physics.btSoftBodyWorldInfo();
            const helpers = new physics.btSoftBodyHelpers();
            
            console.log("Successfully created basic soft body objects");
            
            // Test creating a soft body world
            const collisionConfig = new physics.btSoftBodyRigidBodyCollisionConfiguration();
            const dispatcher = new physics.btCollisionDispatcher(collisionConfig);
            const broadphase = new physics.btDbvtBroadphase();
            const solver = new physics.btSequentialImpulseConstraintSolver();
            const softBodySolver = new physics.btDefaultSoftBodySolver();
            
            const world = new physics.btSoftRigidDynamicsWorld(
              dispatcher, broadphase, solver, collisionConfig, softBodySolver
            );
            
            console.log("Successfully created soft body physics world");
            
            // Display overall result
            console.log("%cAmmo.js soft body support: AVAILABLE", "color: green; font-weight: bold");
            
            return {
              available: true,
              details: checks
            };
          } catch (error) {
            console.error("Error creating soft body objects:", error);
            console.log("%cAmmo.js soft body support: NOT AVAILABLE (creation error)", "color: red; font-weight: bold");
            
            return {
              available: false,
              error: error.message,
              details: checks
            };
          }
        } else {
          console.log("%cAmmo.js soft body support: NOT AVAILABLE (missing classes)", "color: red; font-weight: bold");
          
          return {
            available: false,
            error: "Missing required soft body classes",
            details: checks
          };
        }
      } catch (error) {
        console.error("Error initializing Ammo.js:", error);
        
        return {
          available: false,
          error: error.message
        };
      }
    };
    
    // Execute the check
    return checkAmmo();
  }
  
  // Function to create a visual display of Ammo.js capabilities
  export function displayAmmoCapabilities() {
    checkAmmoSoftBodySupport().then(result => {
      // Create UI element to display results
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '10px';
      container.style.right = '10px';
      container.style.width = '300px';
      container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      container.style.color = 'white';
      container.style.padding = '10px';
      container.style.borderRadius = '5px';
      container.style.fontFamily = 'monospace';
      container.style.fontSize = '12px';
      container.style.zIndex = '100';
      
      // Create header
      const header = document.createElement('h3');
      header.textContent = 'Ammo.js Capabilities';
      header.style.margin = '0 0 10px 0';
      container.appendChild(header);
      
      // Create soft body status
      const softBodyStatus = document.createElement('div');
      softBodyStatus.style.marginBottom = '5px';
      softBodyStatus.style.color = result.available ? '#44ff44' : '#ff4444';
      softBodyStatus.textContent = `Soft Body Physics: ${result.available ? 'AVAILABLE ✓' : 'NOT AVAILABLE ✗'}`;
      container.appendChild(softBodyStatus);
      
      // If there's an error, display it
      if (result.error) {
        const errorInfo = document.createElement('div');
        errorInfo.style.color = '#ff4444';
        errorInfo.textContent = `Error: ${result.error}`;
        container.appendChild(errorInfo);
      }
      
      // Add details if available
      if (result.details) {
        const detailsContainer = document.createElement('div');
        detailsContainer.style.marginTop = '10px';
        
        result.details.forEach(item => {
          const itemElement = document.createElement('div');
          itemElement.style.marginBottom = '2px';
          itemElement.style.color = item.available ? '#44ff44' : '#ff4444';
          itemElement.textContent = `${item.name}: ${item.available ? '✓' : '✗'}`;
          detailsContainer.appendChild(itemElement);
        });
        
        container.appendChild(detailsContainer);
      }
      
      // Add button to close the display
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      closeButton.style.marginTop = '10px';
      closeButton.style.padding = '5px 10px';
      closeButton.style.cursor = 'pointer';
      
      closeButton.addEventListener('click', () => {
        document.body.removeChild(container);
      });
      
      container.appendChild(closeButton);
      
      // Add to body
      document.body.appendChild(container);
    });
  }