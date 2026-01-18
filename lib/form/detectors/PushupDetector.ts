import { FormDetector } from "../FormDetector";

export class PushupDetector extends FormDetector {
    constructor() {
        super({
            name: 'pushup',

            // Start position: plank - elbows extended, body straight
            startPosition: (angles) => {
                const avgElbow = (angles.leftElbow + angles.rightElbow) / 2;
                const avgShoulder = (angles.leftShoulder + angles.rightShoulder) / 2;
                return avgElbow > 160 && avgShoulder < 60; // Arms straight, shoulders engaged
            },

            // Eccentric starts: elbows begin to bend
            eccentricStarted: (current, previous) => {
                const currentElbow = (current.leftElbow + current.rightElbow) / 2;
                const previousElbow = (previous.leftElbow + previous.rightElbow) / 2;
                return currentElbow < previousElbow - 3; // Decreasing by significant amount
            },

            // Turnaround: bottom of pushup
            turnaroundReached: (angles) => {
                const avgElbow = (angles.leftElbow + angles.rightElbow) / 2;
                return avgElbow < 90; // Elbows bent to ~90 degrees or less
            },

            // Concentric starts: elbows begin to extend
            concentricStarted: (current, previous) => {
                const currentElbow = (current.leftElbow + current.rightElbow) / 2;
                const previousElbow = (previous.leftElbow + previous.rightElbow) / 2;
                return currentElbow > previousElbow + 3; // Increasing
            },

            // End position: back to plank
            endPosition: (angles) => {
                const avgElbow = (angles.leftElbow + angles.rightElbow) / 2;
                return avgElbow > 160;
            },

            minRepDuration: 500,    // 0.5 seconds minimum
            maxRepDuration: 5000,   // 5 seconds maximum
            restThreshold: 1000,    // 1 second in plank to start set
            setEndThreshold: 3000,  // 3 seconds idle to end set

            analyzeForm: (rep) => {
                const feedback: string[] = [];

                // Check for proper depth
                const minElbow = Math.min(
                    ...rep.frames.map(f => (f.angles.leftElbow + f.angles.rightElbow) / 2)
                );

                if (minElbow > 100) {
                    feedback.push("Go deeper - aim for 90° elbow bend at the bottom");
                }

                // Check symmetry
                const leftElbowRange = rep.frames.map(f => f.angles.leftElbow);
                const rightElbowRange = rep.frames.map(f => f.angles.rightElbow);
                const avgDiff = leftElbowRange.reduce((sum, left, i) =>
                    sum + Math.abs(left - rightElbowRange[i]), 0) / rep.frames.length;

                if (avgDiff > 15) {
                    feedback.push("Keep your body balanced - one side is dipping more than the other");
                }

                // Check body alignment (hips shouldn't sag or pike)
                const hipAngles = rep.frames.map(f => (f.angles.leftHip + f.angles.rightHip) / 2);
                const avgHip = hipAngles.reduce((a, b) => a + b, 0) / hipAngles.length;

                if (avgHip < 160) {
                    feedback.push("Keep your core tight - your hips are sagging");
                } else if (avgHip > 175) {
                    feedback.push("Don't pike your hips - maintain a straight line from head to heels");
                }

                return feedback;
            },
        });
    }
}