export const getChartTooltipProps = (isDarkMode = false) => ({
  contentStyle: {
    borderRadius: 10,
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    fontSize: 12,
    backgroundColor: isDarkMode ? '#0d121a' : '#ffffff',
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
  },
  itemStyle: { color: isDarkMode ? '#cbd5e1' : '#ccd4e1' },
  labelStyle: { color: isDarkMode ? '#f8fafc' : '#0f172a' },
})
