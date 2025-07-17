const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { verification } = require('../../utils/database');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verification-status')
        .setDescription('Check the status of the verification system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                    ephemeral: true
                });
            }
            
            const settings = verification.getSettings(interaction.guild.id);
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Verification System Status')
                .setDescription(`The verification system is currently **${settings.enabled ? 'enabled' : 'disabled'}**.`)
                .setFooter({ text: `Verification System • ${interaction.guild.name}` })
                .setTimestamp();
            
            // Add verification channel
            if (settings.verificationChannelId) {
                const channel = interaction.guild.channels.cache.get(settings.verificationChannelId);
                embed.addFields({ 
                    name: 'Verification Channel', 
                    value: channel ? `${channel} (${channel.id})` : `Unknown Channel (${settings.verificationChannelId})`,
                    inline: true
                });
            } else {
                embed.addFields({ name: 'Verification Channel', value: 'Not set', inline: true });
            }
            
            // Add verified role
            if (settings.verifiedRoleId) {
                const role = interaction.guild.roles.cache.get(settings.verifiedRoleId);
                embed.addFields({ 
                    name: 'Verified Role', 
                    value: role ? `${role} (${role.id})` : `Unknown Role (${settings.verifiedRoleId})`,
                    inline: true
                });
            } else {
                embed.addFields({ name: 'Verified Role', value: 'Not set', inline: true });
            }
            
            // Add unverified role if set
            if (settings.unverifiedRoleId) {
                const role = interaction.guild.roles.cache.get(settings.unverifiedRoleId);
                embed.addFields({ 
                    name: 'Unverified Role', 
                    value: role ? `${role} (${role.id})` : `Unknown Role (${settings.unverifiedRoleId})`,
                    inline: true
                });
            }
            
            // Add log channel if set
            if (settings.logChannelId) {
                const channel = interaction.guild.channels.cache.get(settings.logChannelId);
                embed.addFields({ 
                    name: 'Log Channel', 
                    value: channel ? `${channel} (${channel.id})` : `Unknown Channel (${settings.logChannelId})`,
                    inline: true
                });
            }
            
            // Add verification method
            embed.addFields({ 
                name: 'Verification Method', 
                value: settings.method ? settings.method.charAt(0).toUpperCase() + settings.method.slice(1) : 'Captcha',
                inline: true
            });
            
            // Add auto kick settings
            embed.addFields({ 
                name: 'Auto Kick', 
                value: settings.autoKick ? `Enabled (${settings.autoKickTimeout / 60000} minutes)` : 'Disabled',
                inline: true
            });
            
            // Add verification message
            embed.addFields({ 
                name: 'Welcome Message', 
                value: settings.welcomeMessage || 'Default message'
            });
            
            // Add verification statistics
            const verifiedUsers = Object.keys(verification.get().verifiedUsers[interaction.guild.id] || {}).length;
            const pendingUsers = Object.keys(verification.get().pendingVerifications[interaction.guild.id] || {}).length;
            
            embed.addFields({ 
                name: 'Statistics', 
                value: `Verified Users: ${verifiedUsers}\nPending Verifications: ${pendingUsers}`
            });
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error checking verification status:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while checking the verification system status.')],
                ephemeral: true
            });
        }
    }
};