const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { verification } = require('../../utils/database');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verification-toggle')
        .setDescription('Enable or disable the verification system')
        .addBooleanOption(option => 
            option.setName('enabled')
                .setDescription('Whether to enable or disable the verification system')
                .setRequired(true))
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
            
            const enabled = interaction.options.getBoolean('enabled');
            const settings = verification.getSettings(interaction.guild.id);
            
            if (enabled && !settings.verificationChannelId) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Setup Required', 'Please set up the verification system first using `/verification-setup`.')],
                    ephemeral: true
                });
            }
            
            // Update settings
            verification.updateSettings(interaction.guild.id, { enabled });
            
            const embed = createSuccessEmbed(
                'Verification System ' + (enabled ? 'Enabled' : 'Disabled'),
                `The verification system has been ${enabled ? 'enabled' : 'disabled'}.`
            );
            
            if (enabled) {
                const channel = interaction.guild.channels.cache.get(settings.verificationChannelId);
                if (channel) {
                    embed.addFields({ name: 'Verification Channel', value: `${channel}` });
                }
                
                const verifiedRole = interaction.guild.roles.cache.get(settings.verifiedRoleId);
                if (verifiedRole) {
                    embed.addFields({ name: 'Verified Role', value: `${verifiedRole}` });
                }
            }
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error toggling verification system:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while toggling the verification system.')],
                ephemeral: true
            });
        }
    }
};