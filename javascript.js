graph LR
    %% Slide-Optimized Styling (High Contrast, Bold Text)
    classDef actor fill:#F29C38,stroke:#C27D2C,stroke-width:2px,color:#fff,font-weight:bold;
    classDef trigger fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff,font-weight:bold;
    classDef stage fill:#2980B9,stroke:#1A5276,stroke-width:2px,color:#fff,font-weight:bold;
    classDef build fill:#27AE60,stroke:#196F3D,stroke-width:2px,color:#fff,font-weight:bold;
    classDef diff fill:#8E44AD,stroke:#5B2C6F,stroke-width:2px,color:#fff,font-weight:bold;
    classDef deploy fill:#34495E,stroke:#2F3640,stroke-width:2px,color:#fff,font-weight:bold;

    %% 1. Trigger
    User([fa:fa-user Developer]) -->|Push RST| CI[GitLab CI/CD Trigger]:::trigger
    
    %% 2. Fetch
    CI --> Fetch[Stage 1: Fetch Branches/Tags]:::stage
    
    %% 3. Parallel Builds
    Fetch -->|Per Version| EN[Stage 2: Build EN Web]:::build
    Fetch -->|Per Version| JA[Stage 2: Build JA Web]:::build
    Fetch -->|Per Version| PDF[Stage 2: Generate PDF]:::build
    
    %% 4. Visual Diff & Deploy
    EN --> Diff[Stage 3: Inject Visual Diff Tool]:::diff
    JA --> Diff
    PDF --> Diff
    
    %% 5. End Result
    Diff --> Host[(Stage 4: Hosted Platform)]:::deploy
    Host --> EndUser([fa:fa-users End User]):::actor
