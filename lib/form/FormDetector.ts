export interface JointAngles {
  leftHip: number;
  leftKnee: number;
  rightHip: number;
  leftAnkle: number;
  leftElbow: number;
  leftWrist: number;
  rightKnee: number;
  rightAnkle: number;
  rightElbow: number;
  rightWrist: number;
  leftShoulder: number;
  rightShoulder: number;
}

export interface AngleFrame {
  timestamp: number;
  angles: JointAngles;
}

export interface ThresholdData {
  duration: number;
  sampleRate: number;
  frames: AngleFrame[];
}

// Phase of a single rep
export enum RepPhase {
  WaitingForStart = 'WaitingForStart',
  Start = 'Start',
  Eccentric = 'Eccentric',
  Turnaround = 'Turnaround',
  Concentric = 'Concentric',
  End = 'End',
}

// Overall set state
export enum SetState {
  Idle = 'Idle',           // Not exercising
  Active = 'Active',       // Currently in a set
  Resting = 'Resting',     // Brief pause between reps
  Completed = 'Completed', // Set finished
}

export interface RepData {
  repNumber: number;
  startTime: number;
  endTime?: number;
  phases: {
    start?: number;
    eccentric?: number;
    turnaround?: number;
    concentric?: number;
    end?: number;
  };
  // Store angle data for analysis
  frames: AngleFrame[];
  // Form feedback for this rep
  feedback?: string[];
}

export interface SetData {
  startTime: number;
  endTime?: number;
  reps: RepData[];
  state: SetState;
}

// Exercise-specific configuration
export interface ExerciseConfig {
  name: string;

  // Thresholds for phase detection
  startPosition: (angles: JointAngles) => boolean;
  eccentricStarted: (angles: JointAngles, previous: JointAngles) => boolean;
  turnaroundReached: (angles: JointAngles) => boolean;
  concentricStarted: (angles: JointAngles, previous: JointAngles) => boolean;
  endPosition: (angles: JointAngles) => boolean;

  // Timing constraints
  minRepDuration: number; // ms - ignore reps shorter than this
  maxRepDuration: number; // ms - reset if rep takes longer
  restThreshold: number;  // ms - time in start position before new set
  setEndThreshold: number; // ms - time idle before set ends

  // Form analysis
  analyzeForm?: (repData: RepData, template?: ThresholdData) => string[];
}

export interface DetectorCallbacks {
  onPhaseChange?: (phase: RepPhase) => void;
  onRepCompleted?: (repData: RepData) => void;
  onAttemptStarted?: () => void;
}

export abstract class FormDetector {
  protected currentSet: SetData | null = null;
  protected currentRep: RepData | null = null;
  protected currentPhase: RepPhase = RepPhase.WaitingForStart;
  protected lastFrame: AngleFrame | null = null;
  protected lastPhaseChangeTime: number = 0;
  protected timeInStartPosition: number = 0;
  protected timeIdle: number = 0;
  protected callbacks: DetectorCallbacks = {};

  constructor(protected config: ExerciseConfig) { }

  setCallbacks(callbacks: DetectorCallbacks): void {
    this.callbacks = callbacks;
  }

  // Main processing function - call this with each new frame
  processFrame(frame: AngleFrame): void {
    if (!this.lastFrame) {
      this.lastFrame = frame;
      return;
    }

    const timeDelta = frame.timestamp - this.lastFrame.timestamp;

    // Update set state based on activity
    this.updateSetState(frame, timeDelta);

    // Process rep phases
    if (this.currentSet?.state === SetState.Active) {
      this.updateRepPhase(frame, this.lastFrame);
    }

    this.lastFrame = frame;
  }

  private updateSetState(frame: AngleFrame, timeDelta: number): void {
    const inStartPosition = this.config.startPosition(frame.angles);

    if (inStartPosition) {
      this.timeInStartPosition += timeDelta;
      this.timeIdle = 0;
    } else {
      this.timeInStartPosition = 0;
      this.timeIdle += timeDelta;
    }

    // Start new set if holding start position
    if (!this.currentSet && this.timeInStartPosition > this.config.restThreshold) {
      this.startNewSet(frame.timestamp);
    }

    // End set if idle too long
    if (this.currentSet?.state === SetState.Active &&
      this.timeIdle > this.config.setEndThreshold) {
      this.endSet(frame.timestamp);
    }
  }

  private updateRepPhase(frame: AngleFrame, previousFrame: AngleFrame): void {
    const timeSincePhaseChange = frame.timestamp - this.lastPhaseChangeTime;

    switch (this.currentPhase) {
      case RepPhase.WaitingForStart:
      case RepPhase.End:
        if (this.didReachStart(frame.angles)) {
          this.startNewRep(frame);
        }
        break;

      case RepPhase.Start:
        if (this.didStartEccentric(frame.angles, previousFrame.angles)) {
          this.transitionToPhase(RepPhase.Eccentric, frame.timestamp);
        }
        // Timeout check
        if (timeSincePhaseChange > this.config.maxRepDuration) {
          this.resetRep();
        }
        break;

      case RepPhase.Eccentric:
        if (this.didReachTurnaround(frame.angles)) {
          this.transitionToPhase(RepPhase.Turnaround, frame.timestamp);
        }
        if (timeSincePhaseChange > this.config.maxRepDuration) {
          this.resetRep();
        }
        break;

      case RepPhase.Turnaround:
        if (this.didStartConcentric(frame.angles, previousFrame.angles)) {
          this.transitionToPhase(RepPhase.Concentric, frame.timestamp);
        }
        break;

      case RepPhase.Concentric:
        if (this.didReachEnd(frame.angles)) {
          this.completeRep(frame);
        }
        if (timeSincePhaseChange > this.config.maxRepDuration) {
          this.resetRep();
        }
        break;
    }

    // Always add frame to current rep if we have one
    if (this.currentRep) {
      this.currentRep.frames.push(frame);
    }
  }

  // Phase detection methods (delegated to config)
  didReachStart(angles: JointAngles): boolean {
    return this.config.startPosition(angles);
  }

  didStartEccentric(angles: JointAngles, previous: JointAngles): boolean {
    return this.config.eccentricStarted(angles, previous);
  }

  didReachTurnaround(angles: JointAngles): boolean {
    return this.config.turnaroundReached(angles);
  }

  didStartConcentric(angles: JointAngles, previous: JointAngles): boolean {
    return this.config.concentricStarted(angles, previous);
  }

  didReachEnd(angles: JointAngles): boolean {
    return this.config.endPosition(angles);
  }

  // State management
  private startNewSet(timestamp: number): void {
    this.currentSet = {
      startTime: timestamp,
      reps: [],
      state: SetState.Active,
    };
    this.currentPhase = RepPhase.WaitingForStart;
  }

  private startNewRep(frame: AngleFrame): void {
    const repNumber = (this.currentSet?.reps.length ?? 0) + 1;
    this.currentRep = {
      repNumber,
      startTime: frame.timestamp,
      phases: { start: frame.timestamp },
      frames: [frame],
    };
    this.transitionToPhase(RepPhase.Start, frame.timestamp);
  }

  private transitionToPhase(phase: RepPhase, timestamp: number): void {
    this.currentPhase = phase;
    this.lastPhaseChangeTime = timestamp;

    if (this.currentRep) {
      const phaseKey = phase.toLowerCase() as keyof RepData['phases'];
      this.currentRep.phases[phaseKey] = timestamp;
    }

    this.callbacks.onPhaseChange?.(phase);

    if (phase === RepPhase.Eccentric) {
      this.callbacks.onAttemptStarted?.();
    }
  }

  private completeRep(frame: AngleFrame): void {
    if (!this.currentRep || !this.currentSet) return;

    this.currentRep.endTime = frame.timestamp;
    this.currentRep.phases.end = frame.timestamp;

    const repDuration = this.currentRep.endTime - this.currentRep.startTime;

    // Validate rep duration
    if (repDuration < this.config.minRepDuration) {
      // Too fast, probably noise
      this.resetRep();
      return;
    }

    // Analyze form
    if (this.config.analyzeForm) {
      this.currentRep.feedback = this.config.analyzeForm(this.currentRep);
    }

    // Save rep
    this.currentSet.reps.push(this.currentRep);
    this.callbacks.onRepCompleted?.(this.currentRep);
    this.currentRep = null;
    this.transitionToPhase(RepPhase.End, frame.timestamp);
  }

  private resetRep(): void {
    this.currentRep = null;
    this.currentPhase = RepPhase.WaitingForStart;
  }

  private endSet(timestamp: number): void {
    if (!this.currentSet) return;

    this.currentSet.endTime = timestamp;
    this.currentSet.state = SetState.Completed;

    // Could emit event or callback here
    this.onSetCompleted(this.currentSet);

    this.currentSet = null;
    this.currentRep = null;
    this.currentPhase = RepPhase.WaitingForStart;
  }

  // Getters
  getCurrentSet(): SetData | null {
    return this.currentSet;
  }

  getCurrentRep(): RepData | null {
    return this.currentRep;
  }

  getCurrentPhase(): RepPhase {
    return this.currentPhase;
  }

  getRepCount(): number {
    return this.currentSet?.reps.length ?? 0;
  }

  // Override these in subclasses for specific exercises
  protected onSetCompleted(set: SetData): void {
    console.log(`Set completed: ${set.reps.length} reps`);
  }
}