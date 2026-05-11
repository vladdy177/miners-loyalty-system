import React, { useState, useEffect } from "react";
import axios from "axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement } from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';
import styles from "../styles/Stats.module.css";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement);

const Stats = () => {
    const [data, setData] = useState(null);
    const apiUrl = import.meta.env.VITE_API_URL;

    const getBrandColor = (varName) => {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    };

    useEffect(() => {
        axios.get(`${apiUrl}/api/admin/stats-summary`).then(res => setData(res.data));
    }, [apiUrl]);

    if (!data) return <p className={styles.loading}>Loading Analytics...</p>;

    const brandColors = {
        yellow: getBrandColor('--miners-yellow'),
        orange: getBrandColor('--miners-orange'),
        magenta: getBrandColor('--miners-magenta'),
        cyan: getBrandColor('--miners-blue-cyan'),
        green: getBrandColor('--miners-green'),
        red: getBrandColor('--miners-red'),
        blueLight: getBrandColor('--miners-blue-light'),
        gray: getBrandColor('--miners-gray')
    };

    const genderData = {
        labels: data.gender.map(g => g.gender.toUpperCase()),
        datasets: [{
            data: data.gender.map(g => g.count),
            backgroundColor: [brandColors.magenta, brandColors.yellow, brandColors.cyan, brandColors.orange],
            borderWidth: 0
        }]
    };

    const tierData = {
        labels: data.tiers.map(t => t.tier),
        datasets: [{
            label: 'Users',
            data: data.tiers.map(t => t.count),
            backgroundColor: data.tiers.map(t => {
                if (t.tier === 'GOLD') return brandColors.yellow;
                if (t.tier === 'SILVER') return brandColors.blueLight;
                if (t.tier === 'CREW') return brandColors.orange;
                return brandColors.gray;
            }),
            borderRadius: 6
        }]
    };

    const economyData = {
        labels: ['Earned', 'Spent'],
        datasets: [{
            data: [data.economy.earned, data.economy.burned],
            backgroundColor: [brandColors.green, brandColors.red],
            hoverOffset: 10
        }]
    };

    const ageData = {
        labels: data.ageGroups.map(a => a.age_group),
        datasets: [{
            label: 'Customers',
            data: data.ageGroups.map(a => a.count),
            backgroundColor: brandColors.blueLight,
            borderRadius: 6
        }]
    };

    return (
        <div className={styles.statsGrid}>
            <div className={styles.card}>
                <h3>User Growth (30 Days)</h3>
                <Line data={{
                    labels: data.growth.map(g => new Date(g.date).toLocaleDateString()),
                    datasets: [{
                        label: 'Registrations',
                        data: data.growth.map(g => g.count),
                        borderColor: brandColors.orange,
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
                <h3>Top Branches</h3>
                <div className={styles.branchList}>
                    {data.branches.map(b => (
                        <div key={b.name} className={styles.branchItem}>
                            <span>{b.name}</span>
                            <strong>{b.count} users</strong>
                        </div>
                    ))}
                </div>
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
        </div>
    );
};

export default Stats;