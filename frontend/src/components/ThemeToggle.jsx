import React from 'react';

export const ThemeToggle = ({ isDarkMode, toggleTheme }) => {
    
    const handleClick = (e) => {
        e.stopPropagation(); 
        toggleTheme();
    };

    return (
        <div 
            onClick={handleClick}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
        >
            {/* THE FIX: The Ghost Structure */}
            {/* We copy the exact gap: 8px from your Logout button */}
            <div className="flex items-center" style={{ gap: '8px' }}>
                
                {/* The Ghost Icon - An invisible box taking up the exact space of the Logout icon */}
                <div className="w-5 h-5 shrink-0"></div>
                
                <span 
                    className="text-[13px] font-medium text-slate-700 dark:text-slate-200 transition-colors"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </span>
            </div>
            
            {/* The Animated Toggle Wrapper */}
            <div className="relative flex items-center justify-center w-5 h-5 min-w-[20px] min-h-[20px] shrink-0 overflow-visible">
                
                {/* Sun Icon */}
                <svg
                    className={`absolute inset-0 w-full h-full text-amber-500 transition-all duration-500 ease-in-out transform ${
                        isDarkMode ? 'scale-0 rotate-[90deg] opacity-0' : 'scale-100 rotate-0 opacity-100 delay-200'
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>

                {/* Moon Icon */}
                <svg
                    className={`absolute inset-0 w-full h-full text-blue-400 transition-all duration-500 ease-in-out transform ${
                        isDarkMode ? 'scale-100 rotate-[360deg] opacity-100 delay-200' : 'scale-0 rotate-0 opacity-0'
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path 
                        fillRule="evenodd" 
                        d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" 
                        clipRule="evenodd" 
                    />
                </svg>
                
            </div>
        </div>
    );
};