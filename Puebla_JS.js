        // ============================================================
        //  CONFIGURACIÓN
        // ============================================================
        const MAX_DATA_POINTS = 150;
        const SCIENTIFIC_DECIMALS = 4;

        // ============================================================
        //  ESTADO
        // ============================================================
        let dataHistory = [];
        let packetCount = 0;
        let isConnected = false;

        // ============================================================
        //  REFERENCIAS A GRÁFICOS
        // ============================================================
        const ctxAlt = document.getElementById('altChart').getContext('2d');
        const ctxTemp = document.getElementById('tempChart').getContext('2d');
        const ctxSpeed = document.getElementById('speedChart').getContext('2d');
        const ctxVib = document.getElementById('vibChart').getContext('2d');

        // ============================================================
        //  CREAR GRÁFICOS CON CHART.JS
        // ============================================================
        function createChart(ctx, label, color, borderColor, yLabel) {
            return new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: label,
                        data: [],
                        borderColor: borderColor || color,
                        backgroundColor: color + '33',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#7a8ba3', font: { size: 11 } }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: '#1a253a' },
                            ticks: { color: '#5a6f8a', font: { size: 10 } },
                            title: { display: true, text: 'Tiempo (s)', color: '#7a8ba3' }
                        },
                        y: {
                            grid: { color: '#1a253a' },
                            ticks: { color: '#5a6f8a', font: { size: 10 } },
                            title: { display: true, text: yLabel || label, color: '#7a8ba3' }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }

        const altChart = createChart(ctxAlt, 'Altitud (m)', '#5bc0eb', '#5bc0eb', 'Altitud (m)');
        const tempChart = createChart(ctxTemp, 'Temperatura (°C)', '#ff6b6b', '#ff6b6b', 'Temperatura (°C)');
        const speedChart = createChart(ctxSpeed, 'Velocidad (m/s)', '#a29bfe', '#a29bfe', 'Velocidad (m/s)');
        const vibChart = createChart(ctxVib, 'Vibración (m/s²)', '#ffb142', '#ffb142', 'Vibración (m/s²)');

        // ============================================================
        //  FUNCIONES AUXILIARES
        // ============================================================
        function toScientific(value) {
            if (value === undefined || value === null || isNaN(value)) return '--';
            return Number(value).toExponential(SCIENTIFIC_DECIMALS);
        }

        function formatTime(seconds) {
            return seconds.toFixed(2);
        }

        function formatGPS(lat, lon) {
            if (lat === undefined || lon === undefined) return '--';
            return lat.toFixed(6) + ', ' + lon.toFixed(6);
        }

        function getStatusIcon(value, threshold) {
            if (value === undefined || value === null) return '⏳';
            return value > threshold ? '🟢' : '🟡';
        }

        // ============================================================
        //  ACTUALIZAR INTERFAZ
        // ============================================================
        function updateDashboard(data) {
            // Actualizar métricas
            document.getElementById('tempValue').textContent = data.temp?.toFixed(2) ?? '--';
            document.getElementById('tempSci').textContent = toScientific(data.temp);

            document.getElementById('humValue').textContent = data.hum?.toFixed(2) ?? '--';
            document.getElementById('humSci').textContent = toScientific(data.hum);

            document.getElementById('presValue').textContent = data.pressure?.toFixed(2) ?? '--';
            document.getElementById('presSci').textContent = toScientific(data.pressure);

            document.getElementById('altValue').textContent = data.alt?.toFixed(2) ?? '--';
            document.getElementById('altSci').textContent = toScientific(data.alt);

            document.getElementById('speedValue').textContent = data.speed?.toFixed(2) ?? '--';
            document.getElementById('speedSci').textContent = toScientific(data.speed);

            document.getElementById('accelValue').textContent = data.accel?.toFixed(2) ?? '--';
            document.getElementById('accelSci').textContent = toScientific(data.accel);

            document.getElementById('vibValue').textContent = data.vib?.toFixed(2) ?? '--';
            document.getElementById('vibSci').textContent = toScientific(data.vib);

            document.getElementById('gpsValue').textContent = formatGPS(data.lat, data.lon);

            // Actualizar contador y timestamp
            document.getElementById('packetCounter').innerHTML = `<strong>Paquetes:</strong> ${packetCount}`;
            document.getElementById('lastUpdate').innerHTML = `<strong>Última:</strong> ${new Date().toLocaleTimeString()}`;
        }

        function updateTable(data) {
            const tbody = document.getElementById('tableBody');
            const row = document.createElement('tr');

            const idx = dataHistory.length;
            const status = (data.alt > 50) ? '🟢 Descenso' : (data.alt > 10 ? '🟡 Apertura' : '🔴 Aterrizaje');

            row.innerHTML = `
                <td>${idx}</td>
                <td>${formatTime(data.time)}</td>
                <td>${data.alt?.toFixed(2) ?? '--'}</td>
                <td>${data.temp?.toFixed(2) ?? '--'}</td>
                <td>${data.hum?.toFixed(2) ?? '--'}</td>
                <td>${data.pressure?.toFixed(2) ?? '--'}</td>
                <td>${data.speed?.toFixed(2) ?? '--'}</td>
                <td>${data.accel?.toFixed(2) ?? '--'}</td>
                <td>${data.vib?.toFixed(2) ?? '--'}</td>
                <td style="font-size:11px;">${formatGPS(data.lat, data.lon)}</td>
                <td>${status}</td>
            `;

            tbody.prepend(row);

            // Limitar filas
            while (tbody.children.length > MAX_DATA_POINTS) {
                tbody.removeChild(tbody.lastChild);
            }

            document.getElementById('rowCount').textContent = `${dataHistory.length} registros`;
        }

        function updateCharts(data) {
            const timeLabel = data.time.toFixed(2);

            // Altitud
            altChart.data.labels.push(timeLabel);
            altChart.data.datasets[0].data.push(data.alt ?? 0);
            if (altChart.data.labels.length > MAX_DATA_POINTS) {
                altChart.data.labels.shift();
                altChart.data.datasets[0].data.shift();
            }
            altChart.update('none');

            // Temperatura
            tempChart.data.labels.push(timeLabel);
            tempChart.data.datasets[0].data.push(data.temp ?? 0);
            if (tempChart.data.labels.length > MAX_DATA_POINTS) {
                tempChart.data.labels.shift();
                tempChart.data.datasets[0].data.shift();
            }
            tempChart.update('none');

            // Velocidad
            speedChart.data.labels.push(timeLabel);
            speedChart.data.datasets[0].data.push(data.speed ?? 0);
            if (speedChart.data.labels.length > MAX_DATA_POINTS) {
                speedChart.data.labels.shift();
                speedChart.data.datasets[0].data.shift();
            }
            speedChart.update('none');

            // Vibración
            vibChart.data.labels.push(timeLabel);
            vibChart.data.datasets[0].data.push(data.vib ?? 0);
            if (vibChart.data.labels.length > MAX_DATA_POINTS) {
                vibChart.data.labels.shift();
                vibChart.data.datasets[0].data.shift();
            }
            vibChart.update('none');
        }

        // ============================================================
        //  PROCESAR NUEVO DATO
        // ============================================================
        function processData(data) {
            packetCount++;

            // Asignar tiempo si no viene
            if (!data.time) {
                data.time = dataHistory.length > 0 ?
                    dataHistory[dataHistory.length - 1].time + 0.1 :
                    0;
            }

            dataHistory.push(data);
            if (dataHistory.length > MAX_DATA_POINTS * 2) {
                dataHistory = dataHistory.slice(-MAX_DATA_POINTS);
            }

            updateDashboard(data);
            updateTable(data);
            updateCharts(data);

            // Actualizar LED de conexión
            if (!isConnected) {
                isConnected = true;
                document.getElementById('statusLed').className = 'led';
                document.getElementById('connectionStatus').textContent = '🟢 Conectado';
            }
        }

        // ============================================================
        //  SIMULADOR DE DATOS (para pruebas sin ESP32)
        // ============================================================
        function generateSimulatedData() {
            const last = dataHistory.length > 0 ? dataHistory[dataHistory.length - 1] : null;
            const time = last ? last.time + 0.5 : 0;

            // Simular trayectoria de un CANSAT
            const baseAlt = 100 - (time * 0.5); // descenso
            const alt = Math.max(0, baseAlt + (Math.random() - 0.5) * 2);

            const temp = 23 + Math.sin(time * 0.1) * 2 + (Math.random() - 0.5) * 1.5;
            const hum = 60 + Math.sin(time * 0.05) * 10 + (Math.random() - 0.5) * 5;
            const pressure = 1016 - (100 - alt) * 12 + (Math.random() - 0.5) * 50;
            const speed = Math.max(0, (100 - alt) * 0.08 + (Math.random() - 0.5) * 1.5);
            const accel = 9.8 + (Math.random() - 0.5) * 2;
            const vib = Math.random() * 2 + Math.sin(time * 0.5) * 0.5;

            const lat = 25.869 + (Math.random() - 0.5) * 0.005;
            const lon = -97.5027 + (Math.random() - 0.5) * 0.005;

            return {
                time,
                alt,
                temp,
                hum,
                pressure,
                speed,
                accel,
                vib,
                lat,
                lon
            };
        }

        // ============================================================
        //  CONEXIÓN CON ESP32 (WebSocket o Fetch)
        // ============================================================
        //  OPCIÓN 1: WebSocket (recomendado para tiempo real)
        // ============================================================
        function connectWebSocket() {
            const wsUrl = 'ws://localhost:8080'; // Cambia al IP de tu ESP32
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('✅ WebSocket conectado');
                isConnected = true;
                document.getElementById('statusLed').className = 'led';
                document.getElementById('connectionStatus').textContent = '🟢 Conectado';
            };

            ws.onmessage = (event) => {
                try {
                    const raw = event.data;
                    // Esperamos que el ESP32 envíe JSON
                    const data = JSON.parse(raw);
                    processData(data);
                } catch (e) {
                    // Si no es JSON, intentar parsear como CSV o texto
                    console.warn('Dato no JSON:', event.data);
                    // Puedes agregar lógica para parsear otros formatos
                }
            };

            ws.onclose = () => {
                console.warn('⚠️ WebSocket desconectado');
                isConnected = false;
                document.getElementById('statusLed').className = 'led disconnected';
                document.getElementById('connectionStatus').textContent = '🔴 Desconectado';
                // Reconectar después de 3s
                setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = (err) => {
                console.error('WebSocket error:', err);
            };

            return ws;
        }

        // ============================================================
        //  OPCIÓN 2: Fetch (HTTP polling) — más simple
        // ============================================================
        let pollingInterval = null;

        function startPolling() {
            const url = 'http://localhost:8080/data'; // Cambia al endpoint de tu ESP32
            // Si tu ESP32 sirve datos en JSON

            if (pollingInterval) clearInterval(pollingInterval);

            pollingInterval = setInterval(async () => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('HTTP error');
                    const data = await response.json();
                    processData(data);
                } catch (err) {
                    // Si falla, probar con simulación o mostrar error
                    console.warn('Polling falló, usando simulación:', err.message);
                    // Descomentar para usar simulación automática:
                    // const simData = generateSimulatedData();
                    // processData(simData);

                    // Mostrar desconectado si falla varias veces
                    if (!isConnected) {
                        document.getElementById('statusLed').className = 'led disconnected';
                        document.getElementById('connectionStatus').textContent = '🔴 Sin datos';
                    }
                }
            }, 200); // cada 200ms
        }

        // ============================================================
        //  OPCIÓN 3: SIMULACIÓN (para pruebas sin hardware)
        // ============================================================
        let simInterval = null;

        function startSimulation() {
            if (simInterval) clearInterval(simInterval);
            // Generar 2 datos por segundo
            simInterval = setInterval(() => {
                const data = generateSimulatedData();
                processData(data);
            }, 300);
        }

        // ============================================================
        //  INICIALIZACIÓN
        // ============================================================
        function init() {
            // Elegir método de conexión:

            // 1. WebSocket (descomentar si usas WebSocket)
            // connectWebSocket();

            // 2. Polling HTTP (descomentar si usas HTTP)
            // startPolling();

            // 3. Simulación (para pruebas)
            startSimulation();

            // También puedes probar con simulación por defecto:
            console.log(' POLARIX - Estación Terrena iniciada');
            console.log(' Usando simulación de datos. Cambia a WebSocket o HTTP para conectar con ESP32.');
        }

        // Ejecutar al cargar la página
        init();
