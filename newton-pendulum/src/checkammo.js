// Function to check if Ammo.js has soft body support
export function checkAmmoSoftBodySupport() {
    console.log("Checking Ammo.js soft body support...");
    
    // Create a visible log on the page
    const logDiv = document.createElement('div');
    logDiv.style.position = 'absolute';
    logDiv.style.top = '10px';
    logDiv.style.left = '10px';
    logDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    logDiv.style.color = 'white';
    logDiv.style.padding = '10px';
    logDiv.style.borderRadius = '5px';
    logDiv.style.fontFamily = 'monospace';
    logDiv.style.zIndex = '1000';
    logDiv.style.maxWidth = '80%';
    logDiv.style.maxHeight = '80%';
    logDiv.style.overflow = 'auto';
    document.body.appendChild(logDiv);
    
    function log(message, isError = false) {
      console.log(message);
      const line = document.createElement('div');
      line.textContent = message;
      if (isError) {
        line.style.color = 'red';
      } else if (message.includes('✓')) {
        line.style.color = 'lightgreen';
      }
      logDiv.appendChild(line);
    }
    
    // Check if Ammo is available
    if (typeof Ammo === 'undefined') {
      log('❌ Ammo.js is not loaded', true);
      return false;
    }
    
    log('✓ Ammo.js is loaded');
    
    // We'll check for the presence of key soft body classes
    const softBodyClasses = [
      'btSoftBodyHelpers',
      'btSoftBodyWorldInfo',
      'btSoftRigidDynamicsWorld',
      'btSoftBodyRigidBodyCollisionConfiguration',
      'btDefaultSoftBodySolver'
    ];
    
    let allClassesAvailable = true;
    
    // First check if classes are directly accessible
    for (const className of softBodyClasses) {
      if (typeof Ammo[className] === 'function') {
        log(`✓ ${className} is available directly`);
      } else {
        log(`${className} is not available directly, will check after initialization`);
        allClassesAvailable = false;
      }
    }
    
    // If all classes are available, we're good
    if (allClassesAvailable) {
      log('✓ Ammo.js has soft body support!');
      return true;
    }
    
    // If not, we'll need to check after Ammo is initialized
    log('Will check again after Ammo.js is fully initialized...');
    
    // If Ammo is a function, it needs to be initialized
    if (typeof Ammo === 'function') {
      log('Ammo.js needs initialization...');
      
      Ammo().then(function(AmmoLib) {
        log('Ammo.js has been initialized');
        
        // Check for soft body classes after initialization
        let softBodySupport = true;
        
        for (const className of softBodyClasses) {
          if (typeof AmmoLib[className] === 'function') {
            log(`✓ ${className} is available after initialization`);
          } else {
            log(`❌ ${className} is NOT available after initialization`, true);
            softBodySupport = false;
          }
        }
        
        if (softBodySupport) {
          log('✓ Ammo.js has soft body support!');
          
          // Optional: Try to create a simple soft body to confirm
          try {
            const collisionConfig = new AmmoLib.btSoftBodyRigidBodyCollisionConfiguration();
            const dispatcher = new AmmoLib.btCollisionDispatcher(collisionConfig);
            const broadphase = new AmmoLib.btDbvtBroadphase();
            const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
            const softBodySolver = new AmmoLib.btDefaultSoftBodySolver();
            
            const softRigidWorld = new AmmoLib.btSoftRigidDynamicsWorld(
              dispatcher, broadphase, solver, collisionConfig, softBodySolver
            );
            
            log('✓ Successfully created a btSoftRigidDynamicsWorld instance');
            
            // Try to create a soft body world info
            const worldInfo = new AmmoLib.btSoftBodyWorldInfo();
            log('✓ Successfully created btSoftBodyWorldInfo');
            
            // Try to create soft body helpers
            const helpers = new AmmoLib.btSoftBodyHelpers();
            log('✓ Successfully created btSoftBodyHelpers');
            
            // Clean up
            AmmoLib.destroy(worldInfo);
            AmmoLib.destroy(helpers);
            AmmoLib.destroy(softRigidWorld);
            AmmoLib.destroy(softBodySolver);
            AmmoLib.destroy(solver);
            AmmoLib.destroy(broadphase);
            AmmoLib.destroy(dispatcher);
            AmmoLib.destroy(collisionConfig);
            
            log('✓ Full soft body functionality confirmed!');
            return true;
          } catch (error) {
            log(`❌ Error creating soft body instances: ${error.message}`, true);
            log('Your Ammo.js build might have the classes but not full implementation.', true);
            return false;
          }
        } else {
          log('❌ Ammo.js does NOT have soft body support', true);
          log('You need to use a different build of Ammo.js with soft body support.', true);
          return false;
        }
      }).catch(function(error) {
        log(`❌ Error initializing Ammo.js: ${error.message}`, true);
        return false;
      });
    } else {
      // If Ammo is already an object, check the instance
      log('Ammo.js is already initialized, checking instance...');
      
      // Check for soft body classes on the instance
      let softBodySupport = true;
      
      for (const className of softBodyClasses) {
        if (typeof Ammo[className] === 'function') {
          log(`✓ ${className} is available in Ammo instance`);
        } else {
          log(`❌ ${className} is NOT available in Ammo instance`, true);
          softBodySupport = false;
        }
      }
      
      if (softBodySupport) {
        log('✓ Ammo.js has soft body support!');
      } else {
        log('❌ Ammo.js does NOT have soft body support', true);
        log('You need to use a different build of Ammo.js with soft body support.', true);
      }
      
      return softBodySupport;
    }
  }
  
  // Add this to your main.js before initializing physics
  // For example, just before the init() function call:
  /*
  checkAmmoSoftBodySupport();
  init();
  */