const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { welcome } = require('../../utils/database');
const Canvas = require('canvas');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-setup')
        .setDescription('Set up the welcome system')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to send welcome messages to')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The welcome message (use {user} for the username, {server} for the server name)')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('image')
                .setDescription('Whether to include a welcome image')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('color')
                .setDescription('The color for the welcome message (hex code)')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('dm')
                .setDescription('Whether to send a DM to new members')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('dm-message')
                .setDescription('The DM message (use {user} for the username, {server} for the server name)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message') || 'Welcome to {server}, {user}! We hope you enjoy your stay.';
        const useImage = interaction.options.getBoolean('image') ?? true;
        const color = interaction.options.getString('color') || '#7289DA';
        const sendDM = interaction.options.getBoolean('dm') ?? false;
        const dmMessage = interaction.options.getString('dm-message') || 'Welcome to {server}, {user}! We\'re glad to have you.';
        
        try {
            // Validate color
            if (!/^#[0-9A-F]{6}$/i.test(color)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Invalid Color', 'Please provide a valid hex color code (e.g., #7289DA).')],
                    ephemeral: true
                });
            }
            
            // Update welcome settings
            welcome.updateSettings(interaction.guild.id, {
                enabled: true,
                channelId: channel.id,
                message: message,
                useImage: useImage,
                color: color,
                dmEnabled: sendDM,
                dmMessage: dmMessage
            });
            
            const embed = createSuccessEmbed(
                'Welcome System Setup',
                'The welcome system has been set up successfully.'
            )
            .addFields(
                { name: 'Channel', value: `${channel}`, inline: true },
                { name: 'Message', value: message, inline: true },
                { name: 'Image', value: useImage ? 'Enabled' : 'Disabled', inline: true },
                { name: 'Color', value: color, inline: true },
                { name: 'DM', value: sendDM ? 'Enabled' : 'Disabled', inline: true }
            );
            
            if (sendDM) {
                embed.addFields({ name: 'DM Message', value: dmMessage });
            }
            
            await interaction.reply({ embeds: [embed] });
            
            // Send a test welcome message
            if (useImage) {
                const canvas = Canvas.createCanvas(1024, 500);
                const ctx = canvas.getContext('2d');
                
                // Draw background
                ctx.fillStyle = '#23272A';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw welcome text
                ctx.font = 'bold 60px sans-serif';
                ctx.fillStyle = color;
                ctx.textAlign = 'center';
                ctx.fillText('Welcome to the Server!', canvas.width / 2, 100);
                
                // Draw username
                ctx.font = 'bold 40px sans-serif';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(interaction.user.tag, canvas.width / 2, 180);
                
                // Draw server name
                ctx.font = '30px sans-serif';
                ctx.fillText(`You are member #${interaction.guild.memberCount}`, canvas.width / 2, 240);
                
                // Draw avatar
                ctx.beginPath();
                ctx.arc(canvas.width / 2, 350, 100, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                
                const avatar = await Canvas.loadImage(interaction.user.displayAvatarURL({ extension: 'png', size: 256 }));
                ctx.drawImage(avatar, canvas.width / 2 - 100, 250, 200, 200);
                
                const attachment = { attachment: canvas.toBuffer(), name: 'welcome.png' };
                
                const testMessage = message
                    .replace(/{user}/g, interaction.user.toString())
                    .replace(/{server}/g, interaction.guild.name);
                
                const testEmbed = createInfoEmbed(
                    'Welcome Test',
                    testMessage
                )
                .setImage('attachment://welcome.png')
                .setColor(color);
                
                await channel.send({ embeds: [testEmbed], files: [attachment] });
            } else {
                const testMessage = message
                    .replace(/{user}/g, interaction.user.toString())
                    .replace(/{server}/g, interaction.guild.name);
                
                const testEmbed = createInfoEmbed(
                    'Welcome Test',
                    testMessage
                )
                .setColor(color);
                
                await channel.send({ embeds: [testEmbed] });
            }
        } catch (error) {
            console.error('Error setting up welcome system:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while setting up the welcome system.')],
                ephemeral: true
            });
        }
    }
};