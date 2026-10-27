function chart(id, type, data, options = {}) {
  if (!window.Chart || !$(id)) return;

  if (charts[id]) {
    charts[id].destroy();
  }

  const defaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#9fc1d8",
          boxWidth: 10,
          font: { size: 10 }
        }
      },
      tooltip: {
        backgroundColor: "#07182b",
        borderColor: "#155477",
        borderWidth: 1
      }
    },
    scales: type === "doughnut"
      ? {}
      : {
          x: {
            ticks: {
              color: "#81a6c1",
              font: { size: 9 }
            },
            grid: { color: "#153047" }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#81a6c1",
              font: { size: 9 }
            },
            grid: { color: "#153047" }
          }
        }
  };

  const finalOptions = {
    ...defaults,
    ...options,
    plugins: {
      ...defaults.plugins,
      ...(options.plugins || {})
    }
  };

  charts[id] = new Chart($(id), {
    type: type,
    data: data,
    options: finalOptions
  });
}
