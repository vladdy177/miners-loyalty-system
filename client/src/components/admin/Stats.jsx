import React, { useState, useEffect } from "react";
import adminApi from "../../utils/adminApi";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement } from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';
import styles from "../styles/Stats.module.css";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement);

const Stats = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const apiUrl = import.meta.env.VITE_API_URL;

    const getBrandColor = (varName) =>
        getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

    useEffect(() => {
        adminApi.get(`${apiUrl}/api/admin/stats-summary`)
            .then(res => setData(res.data))
            .catch(() => setError('Failed to load analytics data.'));
    }, [apiUrl]);

    if (error) return <p className={styles.loading}>{error}</p>;
    if (!data) return <p className={styles.loading}>Loading Analytics...</p>;

    const bc = {
        yellow:    getBrandColor('--miners-yellow'),
        orange:    getBrandColor('--miners-orange'),
        magenta:   getBrandColor('--miners-magenta'),
        cyan:      getBrandColor('--miners-blue-cyan'),
        green:     getBrandColor('--miners-green'),
        red:       getBrandColor('--miners-red'),
        blueLight: getBrandColor('--miners-blue-light'),
        gray:      getBrandColor('--miners-gray')
    };

    const palette = [bc.orange, bc.cyan, bc.magenta, bc.yellow, bc.green, bc.red, bc.blueLight, bc.gray];

    const genderData = {
        labels: (data.gender || []).map(g => (g.gender || 'unspecified').toUpperCase()),
        datasets: [{
            data: (data.gender || []).map(g => Number(g.count)),
            backgroundColor: palette,
            borderWidth: 0
        }]
    };

    const tierData = {
        labels: (data.tiers || []).map(t => t.tier),
        datasets: [{
            label: 'Users',
            data: (data.tiers || []).map(t => Number(t.count)),
            backgroundColor: (data.tiers || []).map(t => {
                if (t.tier === 'GOLD')   return bc.yellow;
                if (t.tier === 'SILVER') return bc.blueLight;
                if (t.tier === 'CREW')   return bc.orange;
                return bc.gray;
            }),
            borderRadius: 6
        }]
    };

    const economyData = {
        labels: ['Earned', 'Spent'],
        datasets: [{
            data: [Number(data.economy?.earned || 0), Number(data.economy?.burned || 0)],
            backgroundColor: [bc.green, bc.red],
            hoverOffset: 10
        }]
    };

    const ageData = {
        labels: (data.ageGroups || []).map(a => a.age_group),
        datasets: [{
            label: 'Customers',
            data: (data.ageGroups || []).map(a => Number(a.count)),
            backgroundColor: bc.blueLight,
            borderRadius: 6
        }]
    };

    const countryData = {
        labels: (data.countries || []).map(c => c.country || 'Unknown'),
        datasets: [{
            data: (data.countries || []).map(c => Number(c.count)),
            backgroundColor: palette.slice(0, (data.countries || []).length),
            borderWidth: 0
        }]
    };

    const cityData = {
        labels: (data.cities || []).map(c => c.city || 'Unknown'),
        datasets: [{
            label: 'Users',
            data: (data.cities || []).map(c => Number(c.count)),
            backgroundColor: palette.slice(0, (data.cities || []).length),
            borderRadius: 4
        }]
    };

    const barHorizontal = {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
    };

    return (
        <div className={styles.statsGrid}>
            <div className={styles.card}>
                <h3>User Growth (30 Days)</h3>
                <Line data={{
                    labels: (data.growth || []).map(g => new Date(g.date).toLocaleDateString()),
                    datasets: [{
                        label: 'Registrations',
                        data: (data.growth || []).map(g => Number(g.count)),
                        borderColor: bc.orange,
                        tension: 0.4,
                        fill: false
                    }]
                }} />
            </div>

            <div className={styles.card}>
                <h3>Gender Distribution</h3>
                <div className={styles.chartContainer}>
                    <Pie data={genderData} />
                </div>
            </div>

            <div className={styles.card}>
                <h3>Membership Tiers</h3>
                <Bar data={tierData} />
            </div>

            <div className={styles.card}>
                <h3>Geographic Distribution</h3>
                <Bar
                    data={{
                        labels: (data.branches || []).map(b => b.name),
                        datasets: [{
                            label: 'Users',
                            data: (data.branches || []).map(b => Number(b.count)),
                            backgroundColor: palette.slice(0, (data.branches || []).length),
                            borderRadius: 4
                        }]
                    }}
                    options={barHorizontal}
                />
            </div>

            <div className={styles.card}>
                <h3>Point Economy</h3>
                <div className={styles.chartContainer}>
                    <Doughnut data={economyData} options={{ cutout: '70%' }} />
                </div>
                <p className={styles.hint}>Ratio between earned points and rewards spent.</p>
            </div>

            <div className={styles.card}>
                <h3>Age Demographics</h3>
                <Bar data={ageData} />
            </div>

            <div className={styles.card}>
                <h3>Users by Country</h3>
                <div className={styles.chartContainer}>
                    <Doughnut data={countryData} options={{ cutout: '60%' }} />
                </div>
            </div>

            <div className={styles.card}>
                <h3>Users by City</h3>
                <Bar data={cityData} options={barHorizontal} />
            </div>
        </div>
    );
};

export default Stats;
