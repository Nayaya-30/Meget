import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';

type AnalyticsCallbacks = {
    onStart?: (tourId: string, userId?: string) => void;
    onStepComplete?: (stepId: string) => void;
    onComplete?: () => void;
    onAbandon?: () => void;
};

interface Step {
    id: string;
    title: string;
    content: string;
    targetElement?: string; // CSS selector
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface WidgetProps extends AnalyticsCallbacks {
    tours?: {
        id?: string;
        steps: Step[];
    };
}

const Avatar = () => {
    return (
        <mesh>
            <Sphere args={[1, 32, 32]} scale={1.5}>
                <MeshDistortMaterial
                    color="#4f46e5"
                    attach="material"
                    distort={0.5}
                    speed={2}
                />
            </Sphere>
        </mesh>
    );
};

export const Widget: React.FC<WidgetProps> = ({ tours, onStart, onStepComplete, onComplete: onCompleteCb, onAbandon }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    // Default steps if none provided
    const steps = tours?.steps || [
        { title: 'Welcome', content: 'Welcome to our platform! Le me show you around.', id: '1' },
        { title: 'Features', content: 'Here are the key features you can use.', id: '2' },
        { title: 'Dashboard', content: 'Track your progress in the dashboard.', id: '3' },
        { title: 'Settings', content: 'Configure your account settings here.', id: '4' },
        { title: 'Get Started', content: 'You are all set! Click here to begin.', id: '5' },
    ];

    const currentStep = steps[currentStepIndex];

    // Load progress from local storage
    useEffect(() => {
        const savedStep = localStorage.getItem('tour-step');
        if (savedStep) {
            const id = setTimeout(() => setCurrentStepIndex(parseInt(savedStep, 10)), 0);
            return () => clearTimeout(id);
        }
    }, []);

    useEffect(() => {
        const userRaw = localStorage.getItem('user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        const tourId = tours?.id || 'demo_tour';
        onStart?.(tourId, user?.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save progress
    useEffect(() => {
        localStorage.setItem('tour-step', currentStepIndex.toString());
    }, [currentStepIndex]);

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
            onStepComplete?.(currentStep.id);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    const handleSkip = () => {
        setIsVisible(false);
        localStorage.removeItem('tour-step');
        onAbandon?.();
    };

    const handleComplete = () => {
        setIsVisible(false);
        localStorage.removeItem('tour-step');
        onCompleteCb?.();
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-4 pointer-events-none">

            {/* 3D Avatar */}
            <div className="w-24 h-24 pointer-events-auto cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <Canvas>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={1} />
                    <Avatar />
                    <OrbitControls enableZoom={false} autoRotate />
                </Canvas>
            </div>

            {/* Popover Card */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="bg-white p-6 rounded-xl shadow-2xl w-80 pointer-events-auto border border-indigo-100"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg text-gray-800">{currentStep.title}</h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                ×
                            </button>
                        </div>

                        <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                            {currentStep.content}
                        </p>

                        <div className="flex items-center justify-between mt-4">
                            <div className="flex gap-1">
                                {steps.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 w-1.5 rounded-full ${idx === currentStepIndex ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                    />
                                ))}
                            </div>
                            <span className="text-xs text-gray-400">
                                {currentStepIndex + 1} / {steps.length}
                            </span>
                        </div>

                        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
                            <button
                                onClick={handleSkip}
                                className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                            >
                                Skip
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleBack}
                                    disabled={currentStepIndex === 0}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                >
                                    {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
