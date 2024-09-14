import React from 'react'

function layout({children}: {children: React.ReactNode}) {
  return (
    <div className="relative flex items-center h-screen w-full flex-col justify-center">
        {children}
    </div>
  )
}

export default layout