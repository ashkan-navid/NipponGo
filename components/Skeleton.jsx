'use client';

/**
 * Reusable Skeleton loading components.
 * Renders shimmer-animated placeholders that match the actual content layout.
 */

function SkeletonBlock({ className = '' }) {
    return <div className={`skeleton-shimmer rounded-ios ${className}`} />;
}

export function SkeletonText({ width = 'w-3/4', className = '' }) {
    return <SkeletonBlock className={`h-4 ${width} ${className}`} />;
}

export function SkeletonCard({ className = '' }) {
    return (
        <div className={`bg-white dark:bg-ios-gray-800 rounded-ios-xl shadow-ios p-4 space-y-3 
                        border border-ios-gray-100 dark:border-ios-gray-700 ${className}`}>
            <SkeletonBlock className="h-5 w-2/5" />
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-4 w-3/5" />
        </div>
    );
}

export function SkeletonDashboard() {
    return (
        <div className="animate-fade-in">
            {/* Hero section */}
            <div className="skeleton-shimmer rounded-b-3xl h-44 mx-0" />

            <div className="px-4 mt-4 space-y-4 pb-6">
                {/* Quick Actions */}
                <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4">
                    <SkeletonBlock className="h-4 w-32 mb-3" />
                    <div className="grid grid-cols-2 gap-2.5">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="p-3.5 rounded-ios-xl bg-ios-gray-50 dark:bg-ios-gray-800 space-y-2">
                                <SkeletonBlock className="w-10 h-10 rounded-ios-lg" />
                                <SkeletonBlock className="h-4 w-20" />
                                <SkeletonBlock className="h-3 w-16" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4">
                    <SkeletonBlock className="h-4 w-28 mb-3" />
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-1">
                                <SkeletonBlock className="h-8 w-8 mx-auto" />
                                <SkeletonBlock className="h-3 w-16 mx-auto" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map placeholder */}
                <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios overflow-hidden">
                    <div className="p-4 border-b border-ios-gray-200 dark:border-ios-gray-800">
                        <SkeletonBlock className="h-4 w-20" />
                    </div>
                    <SkeletonBlock className="h-64 rounded-none" />
                </div>
            </div>
        </div>
    );
}

export default SkeletonBlock;
