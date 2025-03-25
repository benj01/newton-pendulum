import { physicsConfig } from '../config/physics.js';
import { sceneConfig } from '../config/scene.js';
import { visualConfig } from '../config/visual.js';

export class UserConsole {
  constructor(onSettingsChange, onRestart) {
    this.onSettingsChange = onSettingsChange;
    this.onRestart = onRestart;
    this.isVisible = false;
    this.createUI();
    this.setupEventListeners();
  }

  createUI() {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'user-console';
    this.container.style.display = 'none';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'console-header';
    header.innerHTML = `
      <h2>Newton's Cradle Settings</h2>
      <button class="close-btn">×</button>
    `;
    
    // Create tabs
    const tabs = document.createElement('div');
    tabs.className = 'console-tabs';
    tabs.innerHTML = `
      <button class="tab-btn active" data-tab="scene">Scene</button>
      <button class="tab-btn" data-tab="physics">Physics</button>
      <button class="tab-btn" data-tab="visual">Visual</button>
    `;
    
    // Create content sections
    const content = document.createElement('div');
    content.className = 'console-content';
    
    // Scene settings
    const sceneContent = this.createSceneSettings();
    sceneContent.className = 'tab-content active';
    
    // Physics settings
    const physicsContent = this.createPhysicsSettings();
    physicsContent.className = 'tab-content';
    
    // Visual settings
    const visualContent = this.createVisualSettings();
    visualContent.className = 'tab-content';
    
    // Add restart button
    const restartBtn = document.createElement('button');
    restartBtn.className = 'restart-btn';
    restartBtn.textContent = 'Restart Scene';
    
    // Assemble UI
    content.appendChild(sceneContent);
    content.appendChild(physicsContent);
    content.appendChild(visualContent);
    
    this.container.appendChild(header);
    this.container.appendChild(tabs);
    this.container.appendChild(content);
    this.container.appendChild(restartBtn);
    
    document.body.appendChild(this.container);
  }

  createSceneSettings() {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="setting-group">
        <h3>Cradle Settings</h3>
        <div class="setting">
          <label>Number of Balls:</label>
          <input type="number" min="1" max="10" value="${sceneConfig.numBalls}" data-setting="numBalls">
        </div>
        <div class="setting">
          <label>Ball Spacing:</label>
          <input type="range" min="0.8" max="2" step="0.1" value="${sceneConfig.ballSpacing}" data-setting="ballSpacing">
        </div>
        <div class="setting">
          <label>Rope Length:</label>
          <input type="range" min="1" max="4" step="0.1" value="${sceneConfig.ropeLength}" data-setting="ropeLength">
        </div>
        <div class="setting">
          <label>Ball Radius:</label>
          <input type="range" min="0.1" max="1" step="0.1" value="${sceneConfig.ballRadius}" data-setting="ballRadius">
        </div>
      </div>
      
      <div class="setting-group">
        <h3>Animation Settings</h3>
        <div class="setting">
          <label>Animation Speed:</label>
          <input type="range" min="0.1" max="2" step="0.1" value="${sceneConfig.animation.speed}" data-setting="animation.speed">
        </div>
        <div class="setting">
          <label>Auto Start:</label>
          <input type="checkbox" ${sceneConfig.animation.autoStart ? 'checked' : ''} data-setting="animation.autoStart">
        </div>
      </div>
    `;
    return container;
  }

  createPhysicsSettings() {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="setting-group">
        <h3>World Settings</h3>
        <div class="setting">
          <label>Gravity:</label>
          <input type="range" min="-20" max="0" step="0.1" value="${physicsConfig.gravityConstant}" data-setting="gravityConstant">
        </div>
        <div class="setting">
          <label>Time Step:</label>
          <input type="range" min="0.001" max="0.1" step="0.001" value="${physicsConfig.timeStep}" data-setting="timeStep">
        </div>
      </div>
      
      <div class="setting-group">
        <h3>Ball Settings</h3>
        <div class="setting">
          <label>Mass:</label>
          <input type="range" min="0.1" max="5" step="0.1" value="${physicsConfig.ballMass}" data-setting="ballMass">
        </div>
        <div class="setting">
          <label>Restitution:</label>
          <input type="range" min="0" max="1" step="0.01" value="${physicsConfig.ballRestitution}" data-setting="ballRestitution">
        </div>
        <div class="setting">
          <label>Friction:</label>
          <input type="range" min="0" max="1" step="0.01" value="${physicsConfig.ballFriction}" data-setting="ballFriction">
        </div>
      </div>
      
      <div class="setting-group">
        <h3>String Settings</h3>
        <div class="setting">
          <label>Segments:</label>
          <input type="number" min="4" max="16" value="${physicsConfig.stringSegments}" data-setting="stringSegments">
        </div>
        <div class="setting">
          <label>Mass:</label>
          <input type="range" min="0.001" max="0.1" step="0.001" value="${physicsConfig.stringMass}" data-setting="stringMass">
        </div>
      </div>
    `;
    return container;
  }

  createVisualSettings() {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="setting-group">
        <h3>Ball Material</h3>
        <div class="setting">
          <label>Color:</label>
          <input type="color" value="#${visualConfig.ballMaterial.color.toString(16).padStart(6, '0')}" data-setting="ballMaterial.color">
        </div>
        <div class="setting">
          <label>Metalness:</label>
          <input type="range" min="0" max="1" step="0.01" value="${visualConfig.ballMaterial.metalness}" data-setting="ballMaterial.metalness">
        </div>
        <div class="setting">
          <label>Roughness:</label>
          <input type="range" min="0" max="1" step="0.01" value="${visualConfig.ballMaterial.roughness}" data-setting="ballMaterial.roughness">
        </div>
      </div>
      
      <div class="setting-group">
        <h3>Frame Material</h3>
        <div class="setting">
          <label>Color:</label>
          <input type="color" value="#${visualConfig.frameMaterial.color.toString(16).padStart(6, '0')}" data-setting="frameMaterial.color">
        </div>
        <div class="setting">
          <label>Metalness:</label>
          <input type="range" min="0" max="1" step="0.01" value="${visualConfig.frameMaterial.metalness}" data-setting="frameMaterial.metalness">
        </div>
        <div class="setting">
          <label>Roughness:</label>
          <input type="range" min="0" max="1" step="0.01" value="${visualConfig.frameMaterial.roughness}" data-setting="frameMaterial.roughness">
        </div>
      </div>
      
      <div class="setting-group">
        <h3>Background</h3>
        <div class="setting">
          <label>Color:</label>
          <input type="color" value="#${visualConfig.background.color.toString(16).padStart(6, '0')}" data-setting="background.color">
        </div>
      </div>
    `;
    return container;
  }

  setupEventListeners() {
    // Toggle console visibility with 'S' key
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 's') {
        this.toggle();
      }
    });
    
    // Close button
    this.container.querySelector('.close-btn').addEventListener('click', () => {
      this.toggle();
    });
    
    // Tab switching
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });
    
    // Settings changes
    this.container.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        this.handleSettingChange(input);
      });
    });
    
    // Restart button
    this.container.querySelector('.restart-btn').addEventListener('click', () => {
      this.onRestart();
    });
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
  }

  switchTab(tabName) {
    // Update tab buttons
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update content sections
    this.container.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });
  }

  handleSettingChange(input) {
    const setting = input.dataset.setting;
    let value = input.type === 'checkbox' ? input.checked : 
                input.type === 'color' ? parseInt(input.value.replace('#', ''), 16) :
                parseFloat(input.value);
    
    // Handle nested properties (e.g., "animation.speed")
    if (setting.includes('.')) {
      const [category, property] = setting.split('.');
      this.updateConfigValue(category, property, value);
    } else {
      // Handle top-level properties
      this.updateConfigValue(setting, null, value);
    }
  }

  updateConfigValue(category, property, value) {
    // Handle nested properties
    if (property) {
      if (category === 'animation') {
        sceneConfig.animation[property] = value;
      } else if (category === 'ballMaterial') {
        visualConfig.ballMaterial[property] = value;
      } else if (category === 'frameMaterial') {
        visualConfig.frameMaterial[property] = value;
      } else if (category === 'background') {
        visualConfig.background[property] = value;
      } else if (category === 'frame') {
        sceneConfig.frame[property] = value;
      } else if (category === 'camera') {
        sceneConfig.camera[property] = value;
      } else if (category === 'lighting') {
        sceneConfig.lighting[property] = value;
      }
    } else {
      // Handle top-level properties
      if (sceneConfig[category] !== undefined) {
        sceneConfig[category] = value;
      } else if (physicsConfig[category] !== undefined) {
        physicsConfig[category] = value;
      } else if (visualConfig[category] !== undefined) {
        visualConfig[category] = value;
      }
    }
    
    // Notify parent of changes
    this.onSettingsChange();
  }
} 