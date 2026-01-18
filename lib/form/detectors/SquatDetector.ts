import { FormDetector } from "../FormDetector";

export class SquatDetector extends FormDetector {
    constructor() {
        super({
            name: 'squat',

            startPosition: (angles) => {
                const avgKnee = (angles.leftKnee + angles.rightKnee) / 2;
                const avgHip = (angles.leftHip + angles.rightHip) / 2;
                return avgKnee > 160 && avgHip > 160; // Standing upright
            },

            eccentricStarted: (current, previous) => {
                const currentKnee = (current.leftKnee + current.rightKnee) / 2;
                const previousKnee = (previous.leftKnee + previous.rightKnee) / 2;
                return currentKnee < previousKnee - 5;
            },

            turnaroundReached: (angles) => {
                const avgKnee = (angles.leftKnee + angles.rightKnee) / 2;
                return avgKnee < 90;
            },

            concentricStarted: (current, previous) => {
                const currentKnee = (current.leftKnee + current.rightKnee) / 2;
                const previousKnee = (previous.leftKnee + previous.rightKnee) / 2;
                return currentKnee > previousKnee + 5;
            },

            endPosition: (angles) => {
                const avgKnee = (angles.leftKnee + angles.rightKnee) / 2;
                return avgKnee > 160;
            },

            minRepDuration: 800,
            maxRepDuration: 6000,
            restThreshold: 1500,
            setEndThreshold: 4000,

            analyzeForm: (rep) => {
                const feedback: string[] = [];

                // Check depth
                const minKnee = Math.min(
                    ...rep.frames.map(f => (f.angles.leftKnee + f.angles.rightKnee) / 2)
                );

                if (minKnee > 100) {
                    feedback.push("Squat deeper - aim for thighs parallel to ground");
                }

                // Check knee-hip ratio (too much knee travel)
                const kneeRange = Math.max(...rep.frames.map(f => f.angles.leftKnee)) - minKnee;
                const hipRange = Math.max(...rep.frames.map(f => f.angles.leftHip)) -
                    Math.min(...rep.frames.map(f => f.angles.leftHip));

                if (kneeRange / hipRange > 1.3) {
                    feedback.push("Push your hips back more - you're relying too much on your knees");
                }

                return feedback;
            },
        });
    }
}
